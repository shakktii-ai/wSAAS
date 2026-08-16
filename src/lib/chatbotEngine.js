/**
 * ============================================================
 * SyncChat Live WhatsApp Chatbot Execution Engine
 * ============================================================
 *
 * Direct, deterministic execution engine for published BotFlow workflows.
 * Multi-tenant isolated by companyId.
 */

import connectDB from '@/lib/db';
import BotFlow from '@/models/BotFlow';
import BotSession from '@/models/BotSession';
import BotExecutionLog from '@/models/BotExecutionLog';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import Contact from '@/models/Contact';
import { sendMetaText, sendMetaTemplate, resolveWhatsAppCredentials } from '@/lib/metaWhatsAppService';
import { saveOutboundMessage } from '@/lib/outboundMessageService';
import { socketService } from '@/lib/socketService';
import { redisService } from '@/lib/redisService';
import { queueService } from '@/lib/queueService';
import { ragEngine } from '@/lib/ragEngine';
import { logWhatsAppTrace, logWhatsAppError, logChatbotTrace, logChatbotError } from './whatsappTraceLogger.js';
import axios from 'axios';

const META_API_VERSION = process.env.META_API_VERSION || 'v20.0';

// ─── TRIGGER MATCHING ───────────────────────────────────────────────────────

function normalizeText(text) {
  return (text || '').toLowerCase().trim();
}

function matchesTrigger(triggerKeyword, incomingText) {
  if (!triggerKeyword) return false;
  const trigger = normalizeText(triggerKeyword);
  const incoming = normalizeText(incomingText);

  if (incoming === trigger) return true;
  if (incoming.includes(trigger)) return true;
  if (incoming.startsWith(trigger)) return true;

  return false;
}

async function updateConversationLastMessage(conversationId, lastMessageText, messageType = 'text') {
  try {
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: lastMessageText,
      lastMessageType: messageType,
      lastMessageAt: new Date(),
    });
  } catch (e) {
    // Non-blocking catch
  }
}

// ─── MAIN ENTRY POINT ────────────────────────────────────────────────────────

/**
 * Called from webhookController after saving inbound message.
 * @param {Object} ctx - { company, conversation, contact, incomingText, messageType, buttonPayloadId, traceId, webhookStart }
 */
export async function triggerChatbotEngine(ctx) {
  const { company, conversation, contact, incomingText, messageType, buttonPayloadId, traceId, webhookStart } = ctx;
  const companyId = company._id;
  const phoneNumberId = company.phoneNumberId || company.whatsappConfig?.phoneNumberId || '';
  const waId = contact.phone || contact.waId;

  logChatbotTrace({
    traceId,
    stage: 'CHATBOT_TRIGGER_CHECK',
    companyId,
    conversationId: conversation._id,
    waId,
    messageType,
    messageText: incomingText,
    buttonPayloadId,
    durationMs: Date.now() - (webhookStart || Date.now()),
  });

  if (!['text', 'button', 'interactive'].includes(messageType) && !incomingText) {
    logChatbotTrace({
      traceId,
      stage: 'CHATBOT_SKIP',
      companyId,
      conversationId: conversation._id,
      waId,
      metadata: { reason: 'NON_TEXT_MESSAGE_TYPE', messageType },
    });
    return;
  }

  try {
    await connectDB();

    // 1. Look for ACTIVE session for this contact
    const existingSession = await BotSession.findOne({
      companyId,
      customerPhone: contact.phone || contact.waId,
      isActive: true,
      isPaused: false,
      expiresAt: { $gt: new Date() },
    });

    logChatbotTrace({
      traceId,
      stage: 'SESSION_LOOKUP',
      companyId,
      conversationId: conversation._id,
      waId,
      sessionId: existingSession ? existingSession._id.toString() : 'NONE',
      isActive: !!existingSession,
      currentNodeId: existingSession ? existingSession.currentNodeId : 'N/A',
      flowId: existingSession ? existingSession.botFlowId.toString() : 'N/A',
    });

    if (existingSession) {
      const flow = await BotFlow.findById(existingSession.botFlowId);
      if (flow && flow.isActive) {
        const currentNode = flow.nodes.find((n) => n.id === existingSession.currentNodeId);
        if (currentNode) {
          const availableButtons = currentNode.buttons || currentNode.listItems || [];
          let matchedButton = null;

          if (availableButtons.length > 0) {
            matchedButton = availableButtons.find(
              (b) =>
                (buttonPayloadId && (b.id === buttonPayloadId || b.nextNodeId === buttonPayloadId || normalizeText(b.title) === normalizeText(buttonPayloadId))) ||
                (incomingText && (b.id === incomingText || normalizeText(b.title) === normalizeText(incomingText)))
            );
          }

          if (matchedButton && matchedButton.nextNodeId) {
            logChatbotTrace({
              traceId,
              stage: 'SESSION_DECISION',
              decision: 'CONTINUE_EXISTING_SESSION',
              companyId,
              conversationId: conversation._id,
              waId,
              sessionId: existingSession._id.toString(),
              currentNodeId: currentNode.id,
              flowId: flow._id.toString(),
            });

            logChatbotTrace({
              traceId,
              stage: 'NODE_RESOLUTION',
              companyId,
              conversationId: conversation._id,
              waId,
              currentNodeId: currentNode.id,
              buttonPayloadId: buttonPayloadId || 'N/A',
              buttonText: incomingText,
              resolvedNextNodeId: matchedButton.nextNodeId,
            });

            await executeChatbotFlow({
              companyId,
              company,
              flow,
              session: existingSession,
              startNodeId: matchedButton.nextNodeId,
              conversation,
              contact,
              incomingText,
              traceId,
              webhookStart,
            });
            return;
          }
        }
      }
    }

    // 2. No button matched existing session — Check for new trigger keyword match
    const activeFlows = await BotFlow.find({ companyId, isActive: true });
    const matchedFlow = activeFlows.find((f) => matchesTrigger(f.triggerKeyword, incomingText));

    if (matchedFlow) {
      logChatbotTrace({
        traceId,
        stage: 'SESSION_DECISION',
        decision: 'START_NEW_SESSION',
        companyId,
        conversationId: conversation._id,
        waId,
        flowId: matchedFlow._id.toString(),
      });

      // Deactivate older sessions for this contact
      await BotSession.updateMany(
        { companyId, customerPhone: contact.phone || contact.waId, isActive: true },
        { isActive: false }
      );

      const session = await BotSession.create({
        companyId,
        contactId: contact._id,
        conversationId: conversation._id,
        botFlowId: matchedFlow._id,
        customerPhone: contact.phone || contact.waId,
        currentNodeId: matchedFlow.nodes[0]?.id || '',
        isActive: true,
        isPaused: false,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000), // 24hr expiration
      });

      const startNode = matchedFlow.nodes[0];
      if (startNode) {
        await executeChatbotFlow({
          companyId,
          company,
          flow: matchedFlow,
          session,
          startNodeId: startNode.id,
          conversation,
          contact,
          incomingText,
          traceId,
          webhookStart,
        });
        return;
      }
    }

    // 3. NO BUTTON Nor TRIGGER MATCHED — Handle Unmatched Customer Text (NO SILENT DROP!)
    logChatbotTrace({
      traceId,
      stage: 'UNMATCHED_INPUT',
      companyId,
      conversationId: conversation._id,
      waId,
      messageText: incomingText,
      expectedInput: existingSession ? 'button_reply' : 'trigger_keyword',
      action: 'ATTEMPTING_RAG_OR_FALLBACK',
    });

    // Attempt Grounded AI / RAG Fallback
    try {
      const ragResult = await ragEngine.generateGroundedResponse({
        companyId,
        query: incomingText,
        conversationId: conversation._id.toString(),
      });

      if (ragResult && ragResult.answer) {
        logChatbotTrace({
          traceId,
          stage: 'CHATBOT_RESPONSE_STARTED',
          companyId,
          conversationId: conversation._id,
          waId,
          metadata: { responseType: 'RAG_AI_FALLBACK' },
        });

        const { resolvedPhoneNumberId, resolvedWabaId, resolvedAccessToken } = resolveWhatsAppCredentials({ company, conversation });
        const sentResult = await sendMetaText({
          phoneNumberId: resolvedPhoneNumberId,
          accessToken: resolvedAccessToken,
          to: contact.phone || contact.waId,
          text: ragResult.answer,
          companyId,
          conversationId: conversation._id,
          wabaId: resolvedWabaId,
          traceId,
        });

        const wamid = sentResult?.messages?.[0]?.id || `rag_${Date.now()}`;
        const savedMsg = await saveOutboundMessage({
          companyId,
          conversationId: conversation._id,
          contactId: contact._id,
          wamid,
          messageType: 'text',
          body: ragResult.answer,
        });
        socketService.broadcastToCompany(companyId.toString(), 'NEW_MESSAGE_RECEIVED', savedMsg);
        await updateConversationLastMessage(conversation._id, ragResult.answer, 'text');

        logChatbotTrace({
          traceId,
          stage: 'CHATBOT_RESPONSE_SENT',
          companyId,
          conversationId: conversation._id,
          waId,
          metadata: { metaMessageId: wamid, confidenceScore: ragResult.confidenceScore },
        });
        return;
      }
    } catch (ragErr) {
      // RAG failed or not available — proceed to fallback guidance
    }

    // Default Fallback Guidance (NO SILENT DROP!)
    const fallbackGuidance = `I didn't quite catch that. Please type 'hii' to view our main menu options or contact support!`;
    const { resolvedPhoneNumberId, resolvedWabaId, resolvedAccessToken } = resolveWhatsAppCredentials({ company, conversation });

    if (resolvedPhoneNumberId && resolvedAccessToken) {
      const sentResult = await sendMetaText({
        phoneNumberId: resolvedPhoneNumberId,
        accessToken: resolvedAccessToken,
        to: contact.phone || contact.waId,
        text: fallbackGuidance,
        companyId,
        conversationId: conversation._id,
        wabaId: resolvedWabaId,
        traceId,
      });

      const wamid = sentResult?.messages?.[0]?.id || `fb_${Date.now()}`;
      const savedMsg = await saveOutboundMessage({
        companyId,
        conversationId: conversation._id,
        contactId: contact._id,
        wamid,
        messageType: 'text',
        body: fallbackGuidance,
      });
      socketService.broadcastToCompany(companyId.toString(), 'NEW_MESSAGE_RECEIVED', savedMsg);
      await updateConversationLastMessage(conversation._id, fallbackGuidance, 'text');

      logChatbotTrace({
        traceId,
        stage: 'CHATBOT_RESPONSE_SENT',
        companyId,
        conversationId: conversation._id,
        waId,
        metadata: { metaMessageId: wamid, type: 'FALLBACK_GUIDANCE' },
      });
    }
  } catch (err) {
    logChatbotError({
      traceId,
      stage: 'TRIGGER_CHATBOT_EXCEPTION',
      companyId,
      conversationId: conversation._id,
      waId,
      errorCode: 'CHATBOT_EXCEPTION',
      errorMessage: err.message,
    });
  }
}

// ─── FLOW EXECUTOR ───────────────────────────────────────────────────────────

/**
 * Execute a chatbot workflow node-by-node starting from startNodeId.
 */
async function executeChatbotFlow({ companyId, company, flow, session, startNodeId, conversation, contact, incomingText, traceId, webhookStart }) {
  const executionStart = Date.now();

  logChatbotTrace({
    traceId,
    stage: 'CHATBOT_RESPONSE_STARTED',
    companyId,
    conversationId: conversation._id,
    waId: contact.phone || contact.waId,
    sessionId: session._id.toString(),
    flowId: flow._id.toString(),
    currentNodeId: startNodeId,
  });

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

  const { resolvedPhoneNumberId, resolvedWabaId, resolvedAccessToken } = resolveWhatsAppCredentials({
    company,
    conversation,
  });

  const phoneNumberId = resolvedPhoneNumberId;
  const accessToken = resolvedAccessToken;
  const wabaId = resolvedWabaId;
  const targetPhone = contact.phone || contact.waId;

  let currentNodeId = startNodeId;
  const maxSteps = 50;
  let steps = 0;
  let lastResult = null;

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
        traceId,
      });

      lastResult = result;
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

      if (result.pauseForInput) {
        // Interactive Buttons or List Node — Keep session active and point to THIS node!
        await BotSession.findByIdAndUpdate(session._id, {
          currentNodeId: node.id,
          isActive: true,
          updatedAt: new Date(),
        });

        logChatbotTrace({
          traceId,
          stage: 'CHATBOT_PAUSED_FOR_INPUT',
          companyId,
          conversationId: conversation._id,
          waId: targetPhone,
          sessionId: session._id.toString(),
          currentNodeId: node.id,
        });

        break; // Pause loop waiting for customer button tap
      }

      if (result.endExecution) break;
    } catch (err) {
      nodeError = err.message;
      logChatbotError({
        traceId,
        stage: 'NODE_EXECUTION_ERROR',
        companyId,
        conversationId: conversation._id,
        waId: targetPhone,
        errorCode: 'NODE_ERROR',
        errorMessage: err.message,
      });
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

    if (!lastResult?.pauseForInput) {
      await BotSession.findByIdAndUpdate(session._id, { currentNodeId: nextNodeId, updatedAt: new Date() });
    }

    currentNodeId = nextNodeId;
  }

  // Finalize Session
  const totalDurationMs = Date.now() - executionStart;
  await BotExecutionLog.findByIdAndUpdate(log._id, {
    status: 'COMPLETED',
    completedAt: new Date(),
    totalDurationMs,
  });

  // ONLY mark BotSession inactive if flow completed terminal node (NOT paused for input!)
  if (!lastResult?.pauseForInput && !lastResult?.pauseSession) {
    await BotSession.findByIdAndUpdate(session._id, {
      isActive: false,
      completedAt: new Date(),
    });
  }

  await BotFlow.findByIdAndUpdate(flow._id, { $inc: { executionCount: 1 } });

  logChatbotTrace({
    traceId,
    stage: 'CHATBOT_COMPLETED',
    companyId,
    conversationId: conversation._id,
    waId: targetPhone,
    sessionId: session._id.toString(),
    durationMs: totalDurationMs,
  });
}

// ─── NODE EXECUTORS ───────────────────────────────────────────────────────────

async function executeNode({ node, company, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, incomingText, session, flow, traceId }) {
  switch (node.type) {
    case 'text':
      return executeTextNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, company, traceId });

    case 'buttons':
    case 'quick_reply':
      return executeButtonsNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, company, traceId });

    case 'list':
      return executeListNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, traceId });

    case 'media':
      return executeMediaNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, traceId });

    case 'template':
      return executeTemplateNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, traceId });

    case 'condition':
      return executeConditionNode({ node, incomingText, contact });

    case 'handoff':
      return executeHandoffNode({ conversation, companyId });

    case 'rag_ai':
      return executeRagAiNode({ node, incomingText, companyId, conversation, contact, phoneNumberId, accessToken, targetPhone, traceId });

    case 'end':
      return { endExecution: true, nextNodeId: '' };

    default:
      return { nextNodeId: node.nextNodeId };
  }
}

// ─── TEXT NODE ───────────────────────────────────────────────────────────────

async function executeTextNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, traceId }) {
  const text = node.content || node.text || node.title || 'Hello!';

  const sentResult = await sendMetaText({
    phoneNumberId, accessToken, to: targetPhone, text, companyId, conversationId: conversation._id, wabaId: conversation.wabaId, traceId,
  });

  const wamid = sentResult?.messages?.[0]?.id || `bot_txt_${Date.now()}`;
  const savedMsg = await saveOutboundMessage({
    companyId, conversationId: conversation._id, contactId: contact._id,
    wamid, messageType: 'text', body: text,
  });
  socketService.broadcastToCompany(companyId.toString(), 'NEW_MESSAGE_RECEIVED', savedMsg);
  await updateConversationLastMessage(conversation._id, text, 'text');

  logChatbotTrace({
    traceId,
    stage: 'CHATBOT_RESPONSE_SENT',
    companyId,
    conversationId: conversation._id,
    waId: targetPhone,
    metadata: { metaMessageId: wamid, nodeType: 'text' },
  });

  return { nextNodeId: node.nextNodeId, output: { wamid, text } };
}

// ─── BUTTONS NODE ────────────────────────────────────────────────────────────

async function executeButtonsNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, company, traceId }) {
  const bodyText = node.content || node.title || 'Please choose an option:';
  const buttons = (node.buttons || []).slice(0, 3);

  if (buttons.length === 0) {
    return executeTextNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, traceId });
  }

  const interactivePayload = {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b, idx) => ({
          type: 'reply',
          reply: {
            id: b.id || b.nextNodeId || `btn_${idx}`,
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
      companyId, conversationId: conversation._id, wabaId: conversation.wabaId, traceId,
    });
  } catch (err) {
    const fallbackText = `${bodyText}\n\n${buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n')}`;
    sentResult = { messages: [{ id: `bot_btn_${Date.now()}` }] };
    try {
      await sendMetaText({ phoneNumberId, accessToken, to: targetPhone, text: fallbackText, companyId, conversationId: conversation._id, traceId });
    } catch (e) {
      // Ignore
    }
  }

  const wamid = sentResult?.messages?.[0]?.id || `bot_btn_${Date.now()}`;
  const savedMsg = await saveOutboundMessage({
    companyId, conversationId: conversation._id, contactId: contact._id,
    wamid, messageType: 'interactive', body: bodyText,
  });
  socketService.broadcastToCompany(companyId.toString(), 'NEW_MESSAGE_RECEIVED', savedMsg);
  await updateConversationLastMessage(conversation._id, bodyText, 'interactive');

  logChatbotTrace({
    traceId,
    stage: 'CHATBOT_RESPONSE_SENT',
    companyId,
    conversationId: conversation._id,
    waId: targetPhone,
    metadata: { metaMessageId: wamid, nodeType: 'buttons', buttonOptions: buttons.map((b) => b.title) },
  });

  // Buttons node waits for customer reply — MUST PAUSE FOR INPUT
  return { nextNodeId: '', pauseForInput: true, output: { wamid, buttons: buttons.map((b) => b.title) } };
}

// ─── LIST NODE ───────────────────────────────────────────────────────────────

async function executeListNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, traceId }) {
  const bodyText = node.content || node.title || 'Please select an option:';
  const items = (node.listItems || []).slice(0, 10);

  if (items.length === 0) {
    return executeTextNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, traceId });
  }

  let sentResult = null;
  try {
    const { sendMetaWhatsAppMessage } = await import('@/lib/metaWhatsAppService');
    sentResult = await sendMetaWhatsAppMessage({
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
                  id: item.id || item.nextNodeId || `list_${idx}`,
                  title: (item.title || `Option ${idx + 1}`).substring(0, 24),
                  description: (item.description || '').substring(0, 72),
                })),
              },
            ],
          },
        },
      },
      companyId, conversationId: conversation._id, traceId,
    });
  } catch (err) {
    const fallbackText = `${bodyText}\n\n${items.map((it, i) => `${i + 1}. ${it.title}`).join('\n')}`;
    sentResult = { messages: [{ id: `bot_lst_${Date.now()}` }] };
    try {
      await sendMetaText({ phoneNumberId, accessToken, to: targetPhone, text: fallbackText, companyId, conversationId: conversation._id, traceId });
    } catch (e) {
      // Ignore
    }
  }

  const wamid = sentResult?.messages?.[0]?.id || `bot_lst_${Date.now()}`;
  const savedMsg = await saveOutboundMessage({
    companyId, conversationId: conversation._id, contactId: contact._id,
    wamid, messageType: 'interactive', body: bodyText,
  });
  socketService.broadcastToCompany(companyId.toString(), 'NEW_MESSAGE_RECEIVED', savedMsg);
  await updateConversationLastMessage(conversation._id, bodyText, 'interactive');

  logChatbotTrace({
    traceId,
    stage: 'CHATBOT_RESPONSE_SENT',
    companyId,
    conversationId: conversation._id,
    waId: targetPhone,
    metadata: { metaMessageId: wamid, nodeType: 'list', listItems: items.map((i) => i.title) },
  });

  return { nextNodeId: '', pauseForInput: true, output: { wamid, items: items.map((i) => i.title) } };
}

// ─── MEDIA NODE ──────────────────────────────────────────────────────────────

async function executeMediaNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, traceId }) {
  const mediaUrl = node.mediaUrl || node.url || '';
  const mediaType = node.mediaType || 'image';
  const caption = node.caption || node.content || '';

  if (!mediaUrl) {
    return executeTextNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, traceId });
  }

  const { sendMetaMedia } = await import('@/lib/metaWhatsAppService');
  const sentResult = await sendMetaMedia({
    phoneNumberId, accessToken, to: targetPhone, type: mediaType, mediaUrl, caption, companyId, conversationId: conversation._id, traceId,
  });

  const wamid = sentResult?.messages?.[0]?.id || `bot_med_${Date.now()}`;
  const savedMsg = await saveOutboundMessage({
    companyId, conversationId: conversation._id, contactId: contact._id,
    wamid, messageType: mediaType, mediaUrl, mediaCaption: caption, body: caption || `[${mediaType.toUpperCase()}]`,
  });
  socketService.broadcastToCompany(companyId.toString(), 'NEW_MESSAGE_RECEIVED', savedMsg);

  logChatbotTrace({
    traceId,
    stage: 'CHATBOT_RESPONSE_SENT',
    companyId,
    conversationId: conversation._id,
    waId: targetPhone,
    metadata: { metaMessageId: wamid, nodeType: 'media', mediaType },
  });

  return { nextNodeId: node.nextNodeId, output: { wamid, mediaUrl } };
}

// ─── TEMPLATE NODE ───────────────────────────────────────────────────────────

async function executeTemplateNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, traceId }) {
  const templateName = node.templateName || '';
  const languageCode = node.languageCode || 'en';

  if (!templateName) {
    return executeTextNode({ node, phoneNumberId, accessToken, targetPhone, conversation, contact, companyId, traceId });
  }

  const sentResult = await sendMetaTemplate({
    phoneNumberId, accessToken, to: targetPhone, templateName, languageCode, components: node.components || [], companyId, conversationId: conversation._id, traceId,
  });

  const wamid = sentResult?.messages?.[0]?.id || `bot_tpl_${Date.now()}`;
  const savedMsg = await saveOutboundMessage({
    companyId, conversationId: conversation._id, contactId: contact._id,
    wamid, messageType: 'template', body: `[Template: ${templateName}]`,
  });
  socketService.broadcastToCompany(companyId.toString(), 'NEW_MESSAGE_RECEIVED', savedMsg);

  logChatbotTrace({
    traceId,
    stage: 'CHATBOT_RESPONSE_SENT',
    companyId,
    conversationId: conversation._id,
    waId: targetPhone,
    metadata: { metaMessageId: wamid, nodeType: 'template', templateName },
  });

  return { nextNodeId: node.nextNodeId, output: { wamid, templateName } };
}

// ─── CONDITION NODE ──────────────────────────────────────────────────────────

function executeConditionNode({ node, incomingText }) {
  const operand = normalizeText(incomingText);
  const target = normalizeText(node.conditionValue || node.value || '');
  const operator = node.operator || 'equals';

  let match = false;
  if (operator === 'equals') match = operand === target;
  else if (operator === 'contains') match = operand.includes(target);
  else if (operator === 'starts_with') match = operand.startsWith(target);

  const nextNodeId = match ? (node.trueNextNodeId || node.nextNodeId) : (node.falseNextNodeId || node.elseNodeId || '');
  return { nextNodeId, output: { match, operator, target } };
}

// ─── HANDOFF NODE ────────────────────────────────────────────────────────────

async function executeHandoffNode({ conversation, companyId }) {
  await Conversation.findByIdAndUpdate(conversation._id, {
    status: 'assigned',
    assignedAgent: null,
  });

  socketService.broadcastToCompany(companyId.toString(), 'CONVERSATION_TRANSFERRED', {
    conversationId: conversation._id,
    status: 'assigned',
  });

  return { pauseSession: true, pauseReason: 'Agent handoff node reached', nextNodeId: '' };
}

// ─── RAG AI NODE ─────────────────────────────────────────────────────────────

async function executeRagAiNode({ node, incomingText, companyId, conversation, contact, phoneNumberId, accessToken, targetPhone, traceId }) {
  let answer = '';
  try {
    const ragResult = await ragEngine.generateGroundedResponse({
      companyId,
      query: incomingText,
      conversationId: conversation._id.toString(),
    });
    answer = ragResult?.answer || 'I am an AI assistant. How can I help you?';
  } catch (e) {
    answer = 'I am currently unable to answer that request. An agent will assist you shortly.';
  }

  const sentResult = await sendMetaText({
    phoneNumberId, accessToken, to: targetPhone, text: answer, companyId, conversationId: conversation._id, traceId,
  });

  const wamid = sentResult?.messages?.[0]?.id || `rag_node_${Date.now()}`;
  const savedMsg = await saveOutboundMessage({
    companyId, conversationId: conversation._id, contactId: contact._id,
    wamid, messageType: 'text', body: answer,
  });
  socketService.broadcastToCompany(companyId.toString(), 'NEW_MESSAGE_RECEIVED', savedMsg);
  await updateConversationLastMessage(conversation._id, answer, 'text');

  logChatbotTrace({
    traceId,
    stage: 'CHATBOT_RESPONSE_SENT',
    companyId,
    conversationId: conversation._id,
    waId: targetPhone,
    metadata: { metaMessageId: wamid, nodeType: 'rag_ai' },
  });

  return { nextNodeId: node.nextNodeId, output: { wamid, answer } };
}
