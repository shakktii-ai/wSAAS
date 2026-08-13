/**
 * ============================================================
 * SyncChat Live Automation Execution Engine
 * ============================================================
 *
 * Connects published AutomationFlow visual workflows to real
 * incoming WhatsApp messages via Meta Cloud API webhook.
 *
 * Flow:
 *   Incoming WhatsApp Message
 *     → triggerAutomationEngine()
 *     → match PUBLISHED AutomationFlow by trigger keyword
 *     → create AutomationSession
 *     → executeFlowFromNode() node-by-node
 *     → DELAY nodes: paused, resume via BullMQ job
 *     → CONDITION nodes: evaluate & branch via edges
 *     → MESSAGE/TEMPLATE: sent to Meta Cloud API
 *     → Socket.IO live events to Shared Inbox
 *     → AutomationLog per node execution
 *
 * Guarantees:
 *   - Non-blocking: setImmediate, webhook returns 200 immediately
 *   - Multi-tenant: all queries filtered by companyId
 *   - Deduplication: Redis prevents duplicate execution per WAMID
 *   - Execution logs: every node result logged with durationMs
 *   - BullMQ resume: delay nodes resume automatically
 */

import connectDB from '@/lib/db';
import AutomationFlow from '@/models/AutomationFlow';
import AutomationLog from '@/models/AutomationLog';
import AutomationSession from '@/models/AutomationSession';
import Contact from '@/models/Contact';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import { sendMetaText, sendMetaTemplate, resolveWhatsAppCredentials } from '@/lib/metaWhatsAppService';
import { saveOutboundMessage } from '@/lib/outboundMessageService';
import { socketService } from '@/lib/socketService';
import { redisService } from '@/lib/redisService';
import { queueService } from '@/lib/queueService';
import axios from 'axios';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MAX_STEPS = 100;           // Safety cap — prevents infinite loops
const HTTP_TIMEOUT_MS = 6000;    // Webhook node HTTP timeout

// ─── TRIGGER MATCHING ─────────────────────────────────────────────────────────

function normalizeText(t) {
  return (t || '').toLowerCase().trim();
}

/**
 * Returns true if incomingText matches the flow's triggerKeyword.
 * Supports: exact, contains, startsWith.
 */
function matchesTrigger(flow, incomingText) {
  const kw = normalizeText(flow.triggerKeyword);
  const msg = normalizeText(incomingText);
  if (!kw) return false;

  switch (flow.triggerType) {
    case 'keyword':
    case 'incoming_message':
    default:
      return msg === kw || msg.includes(kw) || msg.startsWith(kw);
    case 'new_contact':
      return false; // handled by contact creation path separately
  }
}

// ─── GRAPH HELPERS ────────────────────────────────────────────────────────────

/**
 * Given a flow's edges and sourceNodeId (+optional sourceHandle),
 * return the target node id for the next step.
 *
 * For condition nodes, sourceHandle is 'true' or 'false'.
 */
function getNextNodeId(flow, currentNodeId, sourceHandle = null) {
  const edge = flow.edges.find(
    (e) =>
      e.source === currentNodeId &&
      (sourceHandle === null || !e.sourceHandle || e.sourceHandle === sourceHandle)
  );
  return edge?.target || null;
}

/**
 * Find the START node of a flow.
 */
function findStartNode(flow) {
  return flow.nodes.find((n) => n.type === 'start') || flow.nodes[0] || null;
}

/**
 * Find a node by its id.
 */
function findNode(flow, nodeId) {
  return flow.nodes.find((n) => n.id === nodeId) || null;
}

// ─── MAIN ENTRY POINT ─────────────────────────────────────────────────────────

/**
 * Called from webhookController after saving inbound message.
 * Fire-and-forget — webhook has already returned HTTP 200.
 *
 * @param {Object} ctx
 *   company      - Company document
 *   conversation - Conversation document
 *   contact      - Contact document
 *   incomingText - Parsed message body
 *   messageType  - e.g. 'text', 'button', 'interactive'
 *   wamid        - Meta message ID (for deduplication)
 */
export async function triggerAutomationEngine(ctx) {
  const { company, conversation, contact, incomingText, messageType, wamid } = ctx;

  // Only process text-bearing messages for keyword matching
  if (!incomingText) return;

  try {
    await connectDB();
    const companyId = company._id;
    const waId = contact.waId || contact.phone;

    // ── Deduplication ─────────────────────────────────────────────────────
    // Prevent the same WAMID from triggering automations twice
    if (wamid) {
      const dedupKey = `auto:dedup:${wamid}`;
      const already = await redisService.get(dedupKey);
      if (already) return;
      await redisService.set(dedupKey, '1', 120);
    }

    // ── Check for active paused session (delay resume via direct message) ──
    // (Delay resume is primarily handled by BullMQ, but if a customer sends
    // a message mid-delay, we leave the session paused and let BullMQ resume)

    // ── Find all published AutomationFlows for this company ───────────────
    const publishedFlows = await AutomationFlow.find({
      companyId,
      status: 'PUBLISHED',
    }).lean();

    if (!publishedFlows.length) return;

    // ── Match trigger keyword ─────────────────────────────────────────────
    const matchedFlow = publishedFlows.find((f) => matchesTrigger(f, incomingText));
    if (!matchedFlow) return;

    // ── Prevent concurrent duplicate sessions for the same contact+flow ───
    const deduplicateKey = `auto:session:${companyId}:${waId}:${matchedFlow._id}`;
    const sessionRunning = await redisService.get(deduplicateKey);
    if (sessionRunning) return;
    await redisService.set(deduplicateKey, '1', 300); // 5 min guard

    // ── Create AutomationSession ──────────────────────────────────────────
    const session = await AutomationSession.create({
      companyId,
      flowId: matchedFlow._id,
      conversationId: conversation._id,
      contactId: contact._id,
      waId,
      customerPhone: contact.phone || waId,
      triggerMessage: incomingText,
      status: 'RUNNING',
      currentNodeId: findStartNode(matchedFlow)?.id || '',
    });

    // ── Emit AUTOMATION_STARTED Socket.IO event ───────────────────────────
    socketService.broadcastToCompany(companyId.toString(), 'AUTOMATION_STARTED', {
      sessionId: session._id,
      flowId: matchedFlow._id,
      flowName: matchedFlow.name,
      waId,
      triggerMessage: incomingText,
    });

    // ── Execute asynchronously, never block webhook ───────────────────────
    setImmediate(() =>
      executeFlowFromNode({
        companyId,
        company,
        flow: matchedFlow,
        session,
        startNodeId: findStartNode(matchedFlow)?.id,
        conversation,
        contact,
        incomingText,
      }).catch((err) => console.error('[AutomationEngine] Execution error:', err.message))
    );
  } catch (err) {
    console.error('[AutomationEngine] triggerAutomationEngine error:', err.message);
  }
}

/**
 * Resume a paused (DELAY) session. Called by BullMQ worker when delay elapses.
 */
export async function resumeAutomationSession(sessionId, nextNodeId) {
  try {
    await connectDB();
    const session = await AutomationSession.findById(sessionId);
    if (!session || session.status !== 'PAUSED') return;

    const flow = await AutomationFlow.findById(session.flowId).lean();
    if (!flow) return;

    const conversation = await Conversation.findById(session.conversationId);
    const contact = await Contact.findById(session.contactId);
    const company = await (await import('@/models/Company')).default.findById(session.companyId);

    if (!conversation || !contact || !company) return;

    await AutomationSession.findByIdAndUpdate(session._id, {
      status: 'RUNNING',
      pausedForDelay: false,
      currentNodeId: nextNodeId,
    });

    await executeFlowFromNode({
      companyId: session.companyId,
      company,
      flow,
      session,
      startNodeId: nextNodeId,
      conversation,
      contact,
      incomingText: session.triggerMessage,
    });
  } catch (err) {
    console.error('[AutomationEngine] resumeAutomationSession error:', err.message);
  }
}

// ─── FLOW EXECUTOR ────────────────────────────────────────────────────────────

async function executeFlowFromNode({ companyId, company, flow, session, startNodeId, conversation, contact, incomingText }) {
  const flowStart = Date.now();
  const executedSteps = [];

  const { resolvedPhoneNumberId, resolvedWabaId, resolvedAccessToken } = resolveWhatsAppCredentials({
    company,
    conversation,
  });

  const phoneNumberId = resolvedPhoneNumberId;
  const accessToken   = resolvedAccessToken;
  const wabaId        = resolvedWabaId;
  const targetPhone   = contact.phone || contact.waId;

  let currentNodeId = startNodeId;
  let steps = 0;
  let flowStatus = 'SUCCESS';
  let flowError = '';

  while (currentNodeId && steps < MAX_STEPS) {
    steps++;
    const node = findNode(flow, currentNodeId);
    if (!node) break;

    const nodeStart = Date.now();
    let nextNodeId = null;
    let nodeOutput = {};
    let nodeError = '';
    let pauseForDelay = false;

    try {
      const result = await executeNode({
        node,
        flow,
        company,
        phoneNumberId,
        accessToken,
        targetPhone,
        conversation,
        contact,
        companyId,
        incomingText,
        session,
      });

      nodeOutput = result.output || {};
      nextNodeId = result.nextNodeId;

      if (result.pauseForDelay) {
        // Schedule BullMQ job to resume after delay
        pauseForDelay = true;
        const delayMs = (result.delaySeconds || 60) * 1000;
        const job = await queueService.addJob('automationQueue', 'AUTOMATION_RESUME', {
          sessionId: session._id.toString(),
          nextNodeId: result.resumeNodeId,
        }, { delay: delayMs, attempts: 3 });

        await AutomationSession.findByIdAndUpdate(session._id, {
          status: 'PAUSED',
          pausedForDelay: true,
          currentNodeId: result.resumeNodeId,
          delayJobId: job.id,
        });
      }

      if (result.endExecution || node.type === 'end' || pauseForDelay) {
        steps = MAX_STEPS; // stop loop
      }
    } catch (err) {
      nodeError = err.message;
      flowError = err.message;
      flowStatus = 'FAILED';
      console.error(`[AutomationEngine] Node ${node.type}(${node.id}) error:`, err.message);
      steps = MAX_STEPS; // stop on critical error
    }

    const durationMs = Date.now() - nodeStart;

    // Log step
    const stepLog = {
      nodeId: node.id,
      nodeType: node.type,
      executedAt: new Date(),
      durationMs,
      output: nodeOutput,
      error: nodeError,
    };
    executedSteps.push(stepLog);

    // Emit per-node Socket.IO event
    socketService.broadcastToCompany(companyId.toString(), 'AUTOMATION_NODE_EXECUTED', {
      sessionId: session._id,
      flowId: flow._id,
      nodeId: node.id,
      nodeType: node.type,
      durationMs,
      status: nodeError ? 'ERROR' : 'OK',
    });

    // Update session current node
    if (!pauseForDelay) {
      await AutomationSession.findByIdAndUpdate(session._id, {
        currentNodeId: nextNodeId || '',
      });
    }

    currentNodeId = nextNodeId;
  }

  // ── Finalize ──────────────────────────────────────────────────────────────
  const totalDurationMs = Date.now() - flowStart;

  if (flowStatus !== 'FAILED' && !session.pausedForDelay) {
    await AutomationSession.findByIdAndUpdate(session._id, {
      status: 'COMPLETED',
      finishedAt: new Date(),
      currentNodeId: '',
    });
  }

  // Write AutomationLog
  await AutomationLog.create({
    companyId,
    flowId: flow._id,
    contactId: contact._id,
    customerPhone: targetPhone,
    status: flowStatus,
    executedSteps,
    errorMessage: flowError,
    durationMs: totalDurationMs,
  });

  // Update flow stats
  await AutomationFlow.findByIdAndUpdate(flow._id, {
    $inc: {
      'executionStats.totalExecutions': 1,
      [`executionStats.${flowStatus === 'SUCCESS' ? 'successful' : 'failed'}`]: 1,
    },
  });

  // Emit completion event
  socketService.broadcastToCompany(companyId.toString(),
    flowStatus === 'SUCCESS' ? 'AUTOMATION_COMPLETED' : 'AUTOMATION_FAILED',
    {
      sessionId: session._id,
      flowId: flow._id,
      flowName: flow.name,
      totalDurationMs,
      stepsExecuted: executedSteps.length,
      status: flowStatus,
      error: flowError || undefined,
    }
  );

  // Clear deduplication lock
  const dedupKey = `auto:session:${companyId}:${contact.waId || contact.phone}:${flow._id}`;
  await redisService.del(dedupKey);
}

// ─── NODE EXECUTOR ────────────────────────────────────────────────────────────

async function executeNode({ node, flow, company, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, incomingText, session }) {
  switch (node.type) {
    case 'start':
      return { nextNodeId: getNextNodeId(flow, node.id), output: { triggered: true } };

    case 'end':
      return { endExecution: true, output: { completed: true } };

    case 'message':
      return await executeMessageNode({ node, flow, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId });

    case 'template':
      return await executeTemplateNode({ node, flow, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId });

    case 'condition':
      return await executeConditionNode({ node, flow, incomingText, contact, session });

    case 'delay':
      return await executeDelayNode({ node, flow });

    case 'tag_contact':
      return await executeTagContactNode({ node, flow, contact, companyId });

    case 'assign_agent':
      return await executeAssignAgentNode({ node, flow, conversation, companyId });

    case 'webhook':
    case 'http_request':
      return await executeHttpNode({ node, flow, contact, conversation });

    case 'ai_reply':
      return await executeAiReplyNode({ node, flow, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, incomingText });

    default:
      return { nextNodeId: getNextNodeId(flow, node.id), output: { skipped: true, type: node.type } };
  }
}

// ─── MESSAGE NODE ─────────────────────────────────────────────────────────────

async function executeMessageNode({ node, flow, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId }) {
  const text = node.data?.text || node.data?.message || node.label || '';
  if (!text) {
    return { nextNodeId: getNextNodeId(flow, node.id), output: { skipped: true, reason: 'No text' } };
  }

  let wamid = `auto_msg_${Date.now()}`;
  let dispatched = false;

  try {
    if (phoneNumberId && accessToken) {
      const result = await sendMetaText({ phoneNumberId, accessToken, to: targetPhone, text });
      wamid = result?.messages?.[0]?.id || wamid;
      dispatched = true;
    }
  } catch (err) {
    console.warn('[AutomationEngine] sendMetaText failed:', err.message);
  }

  // Save to MongoDB → appears in Shared Inbox
  const savedMsg = await saveOutboundMessage({ companyId, conversation, contact, wamid, body: text, messageType: 'text' });
  await updateConversationLastMessage(conversation._id, text, 'text');
  socketService.broadcastToCompany(companyId.toString(), 'NEW_MESSAGE_RECEIVED', savedMsg);

  return {
    nextNodeId: getNextNodeId(flow, node.id),
    output: { wamid, text, dispatched },
  };
}

// ─── TEMPLATE NODE ────────────────────────────────────────────────────────────

async function executeTemplateNode({ node, flow, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId }) {
  const templateName = node.data?.templateName || node.data?.template_name || '';
  const languageCode = node.data?.language || node.data?.languageCode || 'en_US';
  const components   = node.data?.components || [];

  if (!templateName) {
    return { nextNodeId: getNextNodeId(flow, node.id), output: { skipped: true, reason: 'No templateName' } };
  }

  let wamid = `auto_tpl_${Date.now()}`;
  try {
    if (phoneNumberId && accessToken) {
      const result = await sendMetaTemplate({ phoneNumberId, accessToken, to: targetPhone, templateName, languageCode, components });
      wamid = result?.messages?.[0]?.id || wamid;
    }
  } catch (err) {
    console.warn('[AutomationEngine] sendMetaTemplate failed:', err.message);
  }

  const body = `[Template: ${templateName}]`;
  const savedMsg = await saveOutboundMessage({ companyId, conversation, contact, wamid, body, messageType: 'template' });
  await updateConversationLastMessage(conversation._id, body, 'template');
  socketService.broadcastToCompany(companyId.toString(), 'NEW_MESSAGE_RECEIVED', savedMsg);

  return {
    nextNodeId: getNextNodeId(flow, node.id),
    output: { wamid, templateName, languageCode },
  };
}

// ─── CONDITION NODE ───────────────────────────────────────────────────────────

async function executeConditionNode({ node, flow, incomingText, contact, session }) {
  const { operator = 'equals', value = '', field = 'message' } = node.data || {};
  const incoming = normalizeText(incomingText);
  const matchValue = normalizeText(value);

  // Allow checking contact fields too
  let testValue = incoming;
  if (field === 'name') testValue = normalizeText(contact.name);
  if (field === 'phone') testValue = normalizeText(contact.phone);
  if (field === 'tag') testValue = (contact.tags || []).join(' ').toLowerCase();

  let conditionResult = false;
  switch (operator) {
    case 'equals':      conditionResult = testValue === matchValue; break;
    case 'contains':    conditionResult = testValue.includes(matchValue); break;
    case 'starts_with': conditionResult = testValue.startsWith(matchValue); break;
    case 'ends_with':   conditionResult = testValue.endsWith(matchValue); break;
    case 'not_equals':  conditionResult = testValue !== matchValue; break;
    default:            conditionResult = testValue === matchValue;
  }

  // Branch via edge sourceHandle: 'true' or 'false'
  const handle = conditionResult ? 'true' : 'false';
  const nextNodeId = getNextNodeId(flow, node.id, handle)
    || getNextNodeId(flow, node.id); // fallback to default edge

  return {
    nextNodeId,
    output: { conditionResult, operator, field, value, testValue },
  };
}

// ─── DELAY NODE ───────────────────────────────────────────────────────────────

async function executeDelayNode({ node, flow }) {
  const delaySeconds = parseInt(node.data?.delaySeconds || node.data?.delay || 60, 10);
  const resumeNodeId = getNextNodeId(flow, node.id);

  return {
    nextNodeId: null,          // stops the while loop
    pauseForDelay: true,       // triggers BullMQ schedule
    delaySeconds,
    resumeNodeId,
    output: { delaySeconds, resumeNodeId },
  };
}

// ─── TAG CONTACT NODE ─────────────────────────────────────────────────────────

async function executeTagContactNode({ node, flow, contact, companyId }) {
  const tag = node.data?.tag || node.data?.tagName || 'automation-tag';

  // Add tag if not present
  if (!(contact.tags || []).includes(tag)) {
    await Contact.findByIdAndUpdate(contact._id, { $addToSet: { tags: tag } });
    contact.tags = [...(contact.tags || []), tag];
  }

  return {
    nextNodeId: getNextNodeId(flow, node.id),
    output: { action: 'TAG_ADDED', tag },
  };
}

// ─── ASSIGN AGENT NODE ────────────────────────────────────────────────────────

async function executeAssignAgentNode({ node, flow, conversation, companyId }) {
  const agentId = node.data?.agentId || node.data?.userId || null;

  if (agentId) {
    await Conversation.findByIdAndUpdate(conversation._id, {
      assignedAgent: agentId,
      assignedAgentId: agentId,
    });
    socketService.broadcastToCompany(companyId.toString(), 'CONVERSATION_ASSIGNED', {
      conversationId: conversation._id,
      agentId,
    });
  }

  return {
    nextNodeId: getNextNodeId(flow, node.id),
    output: { action: 'AGENT_ASSIGNED', agentId: agentId || 'auto-routing' },
  };
}

// ─── HTTP / WEBHOOK NODE ──────────────────────────────────────────────────────

async function executeHttpNode({ node, flow, contact, conversation }) {
  const url    = node.data?.url || node.data?.webhookUrl || '';
  const method = (node.data?.method || 'POST').toUpperCase();
  const headers = node.data?.headers || {};
  const bodyTemplate = node.data?.body || {};

  if (!url) {
    return { nextNodeId: getNextNodeId(flow, node.id), output: { skipped: true, reason: 'No URL' } };
  }

  try {
    const payload = {
      ...bodyTemplate,
      contact: { name: contact.name, phone: contact.phone, waId: contact.waId },
      conversationId: conversation._id.toString(),
      timestamp: new Date().toISOString(),
    };

    const response = await axios({
      method,
      url,
      data: ['POST', 'PUT', 'PATCH'].includes(method) ? payload : undefined,
      params: method === 'GET' ? payload : undefined,
      headers: { 'Content-Type': 'application/json', ...headers },
      timeout: HTTP_TIMEOUT_MS,
    });

    return {
      nextNodeId: getNextNodeId(flow, node.id),
      output: { statusCode: response.status, data: response.data },
    };
  } catch (err) {
    return {
      nextNodeId: getNextNodeId(flow, node.id),
      output: { error: err.message, url },
    };
  }
}

// ─── AI REPLY NODE ────────────────────────────────────────────────────────────

async function executeAiReplyNode({ node, flow, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, incomingText }) {
  try {
    const { ragEngine } = await import('@/lib/ragEngine');
    const response = await ragEngine.generateAnswer(companyId, incomingText);
    const replyText = response?.text || 'Thank you for reaching out. How can we help you?';

    let wamid = `auto_ai_${Date.now()}`;
    try {
      if (phoneNumberId && accessToken) {
        const result = await sendMetaText({ phoneNumberId, accessToken, to: targetPhone, text: replyText });
        wamid = result?.messages?.[0]?.id || wamid;
      }
    } catch (e) {
      console.warn('[AutomationEngine] AI reply sendMetaText failed:', e.message);
    }

    const savedMsg = await saveOutboundMessage({ companyId, conversation, contact, wamid, body: replyText, messageType: 'text' });
    await updateConversationLastMessage(conversation._id, replyText, 'text');
    socketService.broadcastToCompany(companyId.toString(), 'NEW_MESSAGE_RECEIVED', savedMsg);

    return {
      nextNodeId: getNextNodeId(flow, node.id),
      output: { wamid, replyText, grounded: response?.grounded },
    };
  } catch (err) {
    return {
      nextNodeId: getNextNodeId(flow, node.id),
      output: { error: err.message },
    };
  }
}

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────

async function updateConversationLastMessage(conversationId, body, type) {
  return Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: body,
    lastMessageType: type,
    lastMessageAt: new Date(),
  });
}

export default { triggerAutomationEngine, resumeAutomationSession };
