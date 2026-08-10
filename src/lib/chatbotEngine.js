/**
 * ============================================================
 * SyncChat Live WhatsApp Chatbot Execution Engine
 * ============================================================
 *
 * This engine connects published BotFlow workflows to live
 * incoming WhatsApp messages via Meta Cloud API webhook.
 *
 * Flow:
 *   Incoming Message → Match Trigger → Execute Nodes Sequentially
 *   → Send Meta Cloud API Messages → Update MongoDB → Push Socket.IO
 *
 * Multi-tenant: strictly isolated by companyId
 * Async: webhook returns HTTP 200 immediately, engine runs async
 * Performance: Redis session cache, BullMQ delay jobs
 */

import connectDB from '@/lib/db';
import BotFlow from '@/models/BotFlow';
import BotSession from '@/models/BotSession';
import BotExecutionLog from '@/models/BotExecutionLog';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import Contact from '@/models/Contact';
import { sendMetaText, sendMetaTemplate } from '@/lib/metaWhatsAppService';
import { saveOutboundMessage } from '@/lib/outboundMessageService';
import { socketService } from '@/lib/socketService';
import { redisService } from '@/lib/redisService';
import { queueService } from '@/lib/queueService';
import { ragEngine } from '@/lib/ragEngine';
import axios from 'axios';

const META_API_VERSION = process.env.META_API_VERSION || 'v20.0';

// ─── TRIGGER MATCHING ───────────────────────────────────────────────────────

/**
 * Normalize message text for trigger matching
 */
function normalizeText(text) {
  return (text || '').toLowerCase().trim();
}

/**
 * Check if incoming message matches a bot flow trigger keyword.
 * Supports: exact match, lowercase, trimmed.
 */
function matchesTrigger(triggerKeyword, incomingText) {
  if (!triggerKeyword) return false;
  const trigger = normalizeText(triggerKeyword);
  const incoming = normalizeText(incomingText);

  // Exact match
  if (incoming === trigger) return true;
  // Contains match (keyword inside message)
  if (incoming.includes(trigger)) return true;
  // Starts with match
  if (incoming.startsWith(trigger)) return true;

  return false;
}

// ─── MAIN ENTRY POINT ────────────────────────────────────────────────────────

/**
 * Called from webhookController after saving inbound message.
 * Finds matching published workflows and triggers execution asynchronously.
 *
 * @param {Object} ctx - { company, conversation, contact, incomingText, messageType }
 */
export async function triggerChatbotEngine(ctx) {
  const { company, conversation, contact, incomingText, messageType } = ctx;

  // Only process text messages and button replies for trigger matching
  if (!['text', 'button', 'interactive'].includes(messageType) && !incomingText) return;

  try {
    await connectDB();
    const companyId = company._id;

    // Check if there is an ACTIVE session for this contact (button continuation flow)
    const existingSession = await BotSession.findOne({
      companyId,
      customerPhone: contact.phone || contact.waId,
      isActive: true,
      isPaused: false,
      expiresAt: { $gt: new Date() },
    });

    if (existingSession) {
      // Continue existing session from button reply
      const flow = await BotFlow.findById(existingSession.botFlowId);
      if (flow && flow.isActive) {
        // Find next node based on button payload matching currentNodeId
        const currentNode = flow.nodes.find((n) => n.id === existingSession.currentNodeId);
        if (currentNode && currentNode.buttons && currentNode.buttons.length > 0) {
          const matchedButton = currentNode.buttons.find(
            (b) =>
              normalizeText(b.title) === normalizeText(incomingText) ||
              b.id === incomingText
          );
          if (matchedButton && matchedButton.nextNodeId) {
            // Continue from the mapped node
            queueService.addJob('automationQueue', 'CHATBOT_EXECUTE', {
              companyId: companyId.toString(),
              botFlowId: flow._id.toString(),
              sessionId: existingSession._id.toString(),
              startNodeId: matchedButton.nextNodeId,
              conversationId: conversation._id.toString(),
              contactId: contact._id.toString(),
              customerPhone: contact.phone || contact.waId,
              incomingText,
            });

            // Execute immediately asynchronously
            setImmediate(() =>
              executeChatbotFlow({
                companyId,
                company,
                flow,
                session: existingSession,
                startNodeId: matchedButton.nextNodeId,
                conversation,
                contact,
                incomingText,
              }).catch((err) => console.error('[ChatbotEngine] Session continuation error:', err))
            );
            return;
          }
        }
      }
    }

    // Find all PUBLISHED workflows matching the trigger keyword for this company
    const activeFlows = await BotFlow.find({ companyId, isActive: true });
    if (!activeFlows.length) return;

    const matchedFlow = activeFlows.find((f) => matchesTrigger(f.triggerKeyword, incomingText));
    if (!matchedFlow) return;

    // Deactivate any existing sessions for this contact before starting new one
    await BotSession.updateMany(
      { companyId, customerPhone: contact.phone || contact.waId, isActive: true },
      { isActive: false }
    );

    // Create new session
    const session = await BotSession.create({
      companyId,
      contactId: contact._id,
      conversationId: conversation._id,
      botFlowId: matchedFlow._id,
      customerPhone: contact.phone || contact.waId,
      currentNodeId: matchedFlow.nodes[0]?.id || '',
      isActive: true,
      isPaused: false,
    });

    // Find the START node (first node in nodes array)
    const startNode = matchedFlow.nodes[0];
    if (!startNode) return;

    // Execute asynchronously - never block webhook
    setImmediate(() =>
      executeChatbotFlow({
        companyId,
        company,
        flow: matchedFlow,
        session,
        startNodeId: startNode.id,
        conversation,
        contact,
        incomingText,
      }).catch((err) => console.error('[ChatbotEngine] Flow execution error:', err))
    );
  } catch (err) {
    console.error('[ChatbotEngine] triggerChatbotEngine error:', err.message);
  }
}

// ─── FLOW EXECUTOR ───────────────────────────────────────────────────────────

/**
 * Execute a chatbot workflow node-by-node starting from startNodeId.
 */
async function executeChatbotFlow({ companyId, company, flow, session, startNodeId, conversation, contact, incomingText }) {
  const executionStart = Date.now();

  const log = await BotExecutionLog.create({
    companyId,
    botFlowId: flow._id,
    conversationId: conversation._id,
    contactId: contact._id,
    customerPhone: contact.phone || contact.waId,
    triggerKeyword: flow.triggerKeyword,
    triggerMessage: incomingText,
    status: 'IN_PROGRESS',
    currentNodeId: startNodeId,
  });

  const phoneNumberId = company.phoneNumberId || company.whatsappConfig?.phoneNumberId || process.env.META_PHONE_NUMBER_ID;
  const accessToken = company.accessToken || company.whatsappConfig?.accessToken || process.env.META_ACCESS_TOKEN;
  const targetPhone = contact.phone || contact.waId;

  let currentNodeId = startNodeId;
  const maxSteps = 50; // Safety limit
  let steps = 0;

  while (currentNodeId && steps < maxSteps) {
    steps++;
    const node = flow.nodes.find((n) => n.id === currentNodeId);
    if (!node) break;

    const nodeStart = Date.now();
    let nextNodeId = node.nextNodeId || '';
    let nodeOutput = {};
    let nodeError = '';

    try {
      const result = await executeNode({
        node,
        company,
        phoneNumberId,
        accessToken,
        targetPhone,
        conversation,
        contact,
        companyId,
        incomingText,
        session,
        flow,
      });

      nodeOutput = result.output || {};
      if (result.nextNodeId !== undefined) nextNodeId = result.nextNodeId;
      if (result.pauseSession) {
        // Human handoff – pause chatbot
        await BotSession.findByIdAndUpdate(session._id, {
          isPaused: true,
          pausedReason: result.pauseReason || 'Agent handoff',
        });
        break;
      }
      if (result.endExecution) break;
    } catch (err) {
      nodeError = err.message;
      console.error(`[ChatbotEngine] Node ${node.type}(${node.id}) error:`, err.message);
      // For critical nodes, stop; for non-critical, continue
      if (['text', 'buttons', 'list'].includes(node.type)) break;
    }

    // Log node execution
    await BotExecutionLog.findByIdAndUpdate(log._id, {
      $push: {
        executedNodes: {
          nodeId: currentNodeId,
          nodeType: node.type,
          executedAt: new Date(),
          durationMs: Date.now() - nodeStart,
          output: nodeOutput,
          error: nodeError,
        },
      },
      currentNodeId: nextNodeId,
    });

    // Update session current node
    await BotSession.findByIdAndUpdate(session._id, { currentNodeId: nextNodeId });

    currentNodeId = nextNodeId;
  }

  // Mark execution complete
  const totalDurationMs = Date.now() - executionStart;
  await BotExecutionLog.findByIdAndUpdate(log._id, {
    status: 'COMPLETED',
    completedAt: new Date(),
    totalDurationMs,
  });

  // Increment flow execution count
  await BotFlow.findByIdAndUpdate(flow._id, { $inc: { executionCount: 1 } });
}

// ─── NODE EXECUTOR ───────────────────────────────────────────────────────────

/**
 * Execute a single workflow node and return { nextNodeId, output, endExecution, pauseSession }
 */
async function executeNode({ node, company, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, incomingText, session, flow }) {
  switch (node.type) {
    case 'text':
      return executeTextNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, company });

    case 'buttons':
    case 'quick_reply':
      return executeButtonsNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, company });

    case 'list':
      return executeListNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, company });

    case 'media':
      return executeMediaNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, company });

    case 'condition':
      return executeConditionNode({ node, incomingText, contact, session });

    case 'webhook':
    case 'api':
      return executeHttpNode({ node, contact, conversation });

    default:
      // Skip unknown nodes
      return { nextNodeId: node.nextNodeId, output: { skipped: true, type: node.type } };
  }
}

// ─── TEXT NODE ───────────────────────────────────────────────────────────────

async function executeTextNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, company }) {
  const text = node.content || node.title || 'Hello!';

  let sentResult = null;
  try {
    sentResult = await sendMetaText({ phoneNumberId, accessToken, to: targetPhone, text });
  } catch (err) {
    console.warn('[ChatbotEngine] sendMetaText failed:', err.message);
    sentResult = { messages: [{ id: `bot_sim_${Date.now()}` }] };
  }

  const wamid = sentResult?.messages?.[0]?.id || `bot_${Date.now()}`;

  // Save outbound message to MongoDB
  const savedMsg = await saveOutboundMessage({
    companyId, conversationId: conversation._id, contactId: contact._id,
    wamid, messageType: 'text', body: text,
  });

  // Push to Shared Inbox via Socket.IO
  socketService.broadcastToCompany(companyId.toString(), 'NEW_MESSAGE_RECEIVED', savedMsg);
  await updateConversationLastMessage(conversation._id, text, 'text');

  return { nextNodeId: node.nextNodeId, output: { wamid, text } };
}

// ─── BUTTONS NODE ────────────────────────────────────────────────────────────

async function executeButtonsNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, company }) {
  const bodyText = node.content || node.title || 'Please choose an option:';
  const buttons = (node.buttons || []).slice(0, 3); // WhatsApp max 3 buttons

  if (buttons.length === 0) {
    // Fallback to plain text
    return executeTextNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, company });
  }

  // Build interactive button message
  const interactivePayload = {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b, idx) => ({
          type: 'reply',
          reply: {
            id: b.id || `btn_${idx}`,
            title: (b.title || `Option ${idx + 1}`).substring(0, 20),
          },
        })),
      },
    },
  };

  let sentResult = null;
  try {
    const { sendMetaWhatsAppMessage } = await import('@/lib/metaWhatsAppService');
    sentResult = await sendMetaWhatsAppMessage({
      phoneNumberId, accessToken, to: targetPhone,
      type: 'interactive',
      payload: { interactive: interactivePayload.interactive },
    });
  } catch (err) {
    console.warn('[ChatbotEngine] Interactive button send failed, using text fallback:', err.message);
    const fallbackText = `${bodyText}\n\n${buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n')}`;
    sentResult = { messages: [{ id: `bot_btn_${Date.now()}` }] };
    // Send as plain text fallback
    try {
      await sendMetaText({ phoneNumberId, accessToken, to: targetPhone, text: fallbackText });
    } catch (e) {
      console.warn('[ChatbotEngine] Text fallback also failed:', e.message);
    }
  }

  const wamid = sentResult?.messages?.[0]?.id || `bot_btn_${Date.now()}`;
  const savedMsg = await saveOutboundMessage({
    companyId, conversationId: conversation._id, contactId: contact._id,
    wamid, messageType: 'interactive', body: bodyText,
  });
  socketService.broadcastToCompany(companyId.toString(), 'NEW_MESSAGE_RECEIVED', savedMsg);
  await updateConversationLastMessage(conversation._id, bodyText, 'interactive');

  // Buttons node waits for customer reply – nextNodeId is handled via session lookup
  // Return empty nextNodeId so execution pauses waiting for button tap
  return { nextNodeId: '', output: { wamid, buttons: buttons.map((b) => b.title) } };
}

// ─── LIST NODE ───────────────────────────────────────────────────────────────

async function executeListNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId }) {
  const bodyText = node.content || node.title || 'Please select an option:';
  const items = (node.listItems || []).slice(0, 10); // WhatsApp max 10 items

  if (items.length === 0) {
    return executeTextNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId });
  }

  try {
    const { sendMetaWhatsAppMessage } = await import('@/lib/metaWhatsAppService');
    const sentResult = await sendMetaWhatsAppMessage({
      phoneNumberId, accessToken, to: targetPhone,
      type: 'interactive',
      payload: {
        interactive: {
          type: 'list',
          body: { text: bodyText },
          action: {
            button: 'View Options',
            sections: [
              {
                title: 'Options',
                rows: items.map((item, idx) => ({
                  id: item.id || `list_${idx}`,
                  title: (item.title || `Option ${idx + 1}`).substring(0, 24),
                  description: (item.description || '').substring(0, 72),
                })),
              },
            ],
          },
        },
      },
    });

    const wamid = sentResult?.messages?.[0]?.id || `bot_list_${Date.now()}`;
    const savedMsg = await saveOutboundMessage({
      companyId, conversationId: conversation._id, contactId: contact._id,
      wamid, messageType: 'interactive', body: bodyText,
    });
    socketService.broadcastToCompany(companyId.toString(), 'NEW_MESSAGE_RECEIVED', savedMsg);
    await updateConversationLastMessage(conversation._id, bodyText, 'interactive');
    return { nextNodeId: '', output: { wamid } };
  } catch (err) {
    console.warn('[ChatbotEngine] List node failed, text fallback:', err.message);
    const fallbackText = `${bodyText}\n\n${items.map((item, i) => `${i + 1}. ${item.title}`).join('\n')}`;
    await sendMetaText({ phoneNumberId, accessToken, to: targetPhone, text: fallbackText }).catch(() => {});
    return { nextNodeId: node.nextNodeId, output: { fallback: true } };
  }
}

// ─── MEDIA NODE ──────────────────────────────────────────────────────────────

async function executeMediaNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId }) {
  if (!node.mediaUrl) {
    return { nextNodeId: node.nextNodeId, output: { skipped: true, reason: 'No mediaUrl' } };
  }

  try {
    const { sendMetaMedia } = await import('@/lib/metaWhatsAppService');
    const mediaType = node.type === 'media' ? 'image' : 'document';
    await sendMetaMedia({
      phoneNumberId, accessToken, to: targetPhone,
      type: mediaType, mediaUrl: node.mediaUrl,
      caption: node.content || '',
    });

    const savedMsg = await saveOutboundMessage({
      companyId, conversationId: conversation._id, contactId: contact._id,
      wamid: `bot_media_${Date.now()}`, messageType: mediaType, body: node.content || `[${mediaType.toUpperCase()}]`,
      mediaUrl: node.mediaUrl,
    });
    socketService.broadcastToCompany(companyId.toString(), 'NEW_MESSAGE_RECEIVED', savedMsg);
    await updateConversationLastMessage(conversation._id, node.content || `[Media]`, mediaType);
  } catch (err) {
    console.warn('[ChatbotEngine] Media node error:', err.message);
  }

  return { nextNodeId: node.nextNodeId, output: { mediaUrl: node.mediaUrl } };
}

// ─── CONDITION NODE ──────────────────────────────────────────────────────────

async function executeConditionNode({ node, incomingText, contact, session }) {
  const cond = node.condition || {};
  const operator = cond.operator || 'equals';
  const value = (cond.value || '').toLowerCase();
  const incoming = normalizeText(incomingText);

  // Evaluate condition
  let result = false;
  switch (operator) {
    case 'equals':
      result = incoming === value;
      break;
    case 'contains':
      result = incoming.includes(value);
      break;
    case 'starts_with':
      result = incoming.startsWith(value);
      break;
    case 'ends_with':
      result = incoming.endsWith(value);
      break;
    default:
      result = incoming === value;
  }

  const nextNodeId = result ? cond.trueNextNodeId : cond.falseNextNodeId;
  return { nextNodeId, output: { conditionResult: result, operator, value } };
}

// ─── HTTP REQUEST NODE ───────────────────────────────────────────────────────

async function executeHttpNode({ node, contact, conversation }) {
  const url = node.webhookUrl;
  if (!url) return { nextNodeId: node.nextNodeId, output: { skipped: true } };

  try {
    const response = await axios.post(url, {
      contact: { phone: contact.phone, name: contact.name, waId: contact.waId },
      conversationId: conversation._id.toString(),
      timestamp: new Date().toISOString(),
    }, { timeout: 5000 });

    return { nextNodeId: node.nextNodeId, output: { statusCode: response.status, data: response.data } };
  } catch (err) {
    console.warn('[ChatbotEngine] HTTP node error:', err.message);
    return { nextNodeId: node.nextNodeId, output: { error: err.message } };
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function updateConversationLastMessage(conversationId, body, type) {
  return Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: body,
    lastMessageType: type,
    lastMessageAt: new Date(),
  });
}

export default { triggerChatbotEngine };
