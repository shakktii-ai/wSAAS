import connectDB from '@/lib/db';
import Company from '@/models/Company';
import Conversation from '@/models/Conversation';
import Contact from '@/models/Contact';
import Message from '@/models/Message';
import WebhookLog from '@/models/WebhookLog';
import { triggerChatbotEngine } from '@/lib/chatbotEngine';
import { triggerAutomationEngine } from '@/lib/automationEngine';
import { socketService } from '@/lib/socketService';
import { logWhatsAppTrace, logWhatsAppError } from '@/lib/whatsappTraceLogger';

/**
 * Webhook Verification Handler (GET)
 */
export const verifyWebhook = async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'syncchat_webhook_verify_token_secure_2026-27';

  if (mode && token) {
    if (
      mode === 'subscribe' &&
      (token === expectedToken ||
        token === 'syncchat_verify' ||
        token === 'syncchat_webhook_verify_token_secure_2026-27' ||
        token === 'syncchat_webhook_verify_token_secure_2026-27')
    ) {
      console.log('Meta Webhook Verified Successfully');
      return res.status(200).send(challenge);
    } else {
      console.error('Webhook Verification Failed: Token Mismatch');
      return res.status(403).json({ error: 'Verification token mismatch' });
    }
  }

  return res.status(400).json({ error: 'Invalid verification request parameters' });
};

/**
 * Inbound Webhook Event Handler (POST) - Phase 6
 * Awaits downstream automation/chatbot engines to guarantee Vercel Serverless execution
 */
export const handleWebhookEvent = async (req, res) => {
  const webhookStart = Date.now();
  try {
    await connectDB();
    const body = req.body;

    if (!body || body.object !== 'whatsapp_business_account') {
      return res.status(200).json({ status: 'IGNORED_NON_WHATSAPP_EVENT' });
    }

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0]?.value;

    if (!change) {
      return res.status(200).json({ status: 'NO_CHANGE_VALUE' });
    }

    // 1. Extract phoneNumberId safely from metadata
    const phoneNumberId = change.metadata?.phone_number_id;
    const wabaId = entry?.id || '';

    if (!phoneNumberId) {
      console.error('[Inbound Webhook] Missing phoneNumberId in Meta payload metadata', {
        wabaId,
      });
      return;
    }

    // 2. Find Tenant Company STRICTLY by Phone Number ID (NO Fallbacks Allowed)
    const company = await Company.findOne({
      $or: [
        { 'whatsappConfig.phoneNumberId': phoneNumberId },
        { phoneNumberId: phoneNumberId },
      ],
    });

    const incomingMsgPreview = change.messages?.[0];
    const contactObjPreview = change.contacts?.[0];
    const recipientWaId = incomingMsgPreview?.from || contactObjPreview?.wa_id || '';

    if (!company) {
      console.error('[Inbound Webhook] Company mapping failed', {
        phoneNumberId,
        wabaId,
        recipientWaId,
      });

      await WebhookLog.create({
        companyId: null,
        phoneNumberId: phoneNumberId || '',
        eventType: 'message_received_unlinked',
        payload: body,
        status: 'UNMATCHED',
      });
      return;
    }

    console.log('[Inbound Webhook] Company resolved', {
      companyId: company._id,
      phoneNumberId,
      wabaId,
      recipientWaId,
    });

    // Process Message Delivery/Read Status Updates (Sent, Delivered, Read, Failed)
    if (change.statuses && change.statuses.length > 0) {
      for (const statusObj of change.statuses) {
        const metaMessageId = statusObj.id;
        const status = statusObj.status; // 'sent', 'delivered', 'read', 'failed'

        const updatedMsg = await Message.findOneAndUpdate(
          { $or: [{ metaMessageId }, { wamid: metaMessageId }] },
          {
            deliveryStatus: status,
            status,
            ...(statusObj.errors ? { errorDetails: statusObj.errors } : {}),
          },
          { new: true }
        );

        if (updatedMsg && company) {
          socketService.broadcastToCompany(company._id.toString(), 'MESSAGE_SENT', updatedMsg);
          socketService.broadcastToCompany(company._id.toString(), 'NEW_MESSAGE_RECEIVED', updatedMsg);
        }
      }

      await WebhookLog.create({
        companyId: company._id,
        phoneNumberId: phoneNumberId || '',
        eventType: 'status_updated',
        payload: body,
        status: 'PROCESSED',
      });
      return;
    }

    // Process Incoming Messages
    if (change.messages && change.messages.length > 0) {
      const incomingMsg = change.messages[0];
      const contactObj = change.contacts?.[0];

      const waId = contactObj?.wa_id || incomingMsg.from;
      const customerPhone = incomingMsg.from || waId;
      const customerName = contactObj?.profile?.name || waId;
      const metaMessageId = incomingMsg.id;
      const messageType = incomingMsg.type || 'text';

      const traceId = metaMessageId ? `WHATSAPP_${metaMessageId}` : `WHATSAPP_${Date.now()}`;

      logWhatsAppTrace({
        traceId,
        stage: 'WEBHOOK_RECEIVED',
        companyId: company._id,
        phoneNumberId,
        waId,
        messageId: metaMessageId,
        durationMs: Date.now() - webhookStart,
      });

      logWhatsAppTrace({
        traceId,
        stage: 'TENANT_RESOLVED',
        companyId: company._id,
        phoneNumberId,
        waId,
        messageId: metaMessageId,
        durationMs: Date.now() - webhookStart,
      });

      // Auto-create Contact if does not exist
      let contact = await Contact.findOne({ companyId: company._id, waId });
      if (!contact) {
        contact = await Contact.create({
          companyId: company._id,
          waId,
          phone: customerPhone,
          name: customerName,
          lastSeen: new Date(),
          firstMessageAt: new Date(),
          conversationCount: 1,
        });
      } else {
        contact.lastSeen = new Date();
        if (customerName && contact.name !== customerName) contact.name = customerName;
        await contact.save();
      }

      // Auto-create Conversation if does not exist
      let conversation = await Conversation.findOne({
        companyId: company._id,
        $or: [{ waId }, { customerPhone }],
      });

      if (!conversation) {
        conversation = await Conversation.create({
          companyId: company._id,
          waId,
          customerPhone,
          customerName,
          phoneNumberId: phoneNumberId || company.phoneNumberId || company.whatsappConfig?.phoneNumberId || '',
          wabaId: company.wabaId || company.whatsappConfig?.wabaId || '',
          status: 'open',
          unreadCount: 0,
        });
      } else {
        if (customerName && conversation.customerName !== customerName) {
          conversation.customerName = customerName;
        }
        if (phoneNumberId && conversation.phoneNumberId !== phoneNumberId) {
          conversation.phoneNumberId = phoneNumberId;
        }
        if (!conversation.wabaId && (company.wabaId || company.whatsappConfig?.wabaId)) {
          conversation.wabaId = company.wabaId || company.whatsappConfig?.wabaId;
        }
        await conversation.save();
      }

      let messageBody = '';
      let mediaUrl = '';
      let mediaCaption = '';
      let filename = '';
      let locationData = null;
      let contactCardData = null;

      switch (messageType) {
        case 'text':
          messageBody = incomingMsg.text?.body || '';
          break;

        case 'image':
        case 'video':
        case 'document':
        case 'audio':
        case 'sticker':
          mediaUrl = incomingMsg[messageType]?.link || incomingMsg[messageType]?.id || '';
          mediaCaption = incomingMsg[messageType]?.caption || '';
          filename = incomingMsg[messageType]?.filename || '';
          messageBody = mediaCaption || `[Inbound ${messageType.toUpperCase()}]`;
          if (contact) contact.mediaCount = (contact.mediaCount || 0) + 1;
          break;

        case 'location':
          locationData = {
            latitude: incomingMsg.location?.latitude,
            longitude: incomingMsg.location?.longitude,
            name: incomingMsg.location?.name || 'Shared Location',
            address: incomingMsg.location?.address || '',
          };
          messageBody = `📍 Location: ${locationData.name || locationData.address || `${locationData.latitude}, ${locationData.longitude}`}`;
          break;

        case 'contacts':
          if (incomingMsg.contacts?.[0]) {
            const c = incomingMsg.contacts[0];
            contactCardData = {
              name: c.name?.formatted_name || c.name?.first_name || 'Shared Contact',
              phone: c.phones?.[0]?.phone || '',
              waId: c.phones?.[0]?.wa_id || '',
            };
            messageBody = `👤 Contact Card: ${contactCardData.name} (${contactCardData.phone})`;
          } else {
            messageBody = '[Contact Card]';
          }
          break;

        case 'button':
          messageBody = incomingMsg.button?.text || incomingMsg.button?.payload || '[Button Reply]';
          break;

        case 'interactive':
          if (incomingMsg.interactive?.type === 'button_reply') {
            messageBody = incomingMsg.interactive.button_reply.title || '[Interactive Button]';
          } else if (incomingMsg.interactive?.type === 'list_reply') {
            messageBody = incomingMsg.interactive.list_reply.title || '[List Reply]';
          } else {
            messageBody = '[Interactive Reply]';
          }
          break;

        default:
          messageBody = `[${messageType.toUpperCase()} Message]`;
      }

      // Save incoming message (Check duplicate by metaMessageId)
      const existingMessage = await Message.findOne({
        $or: [{ metaMessageId }, { wamid: metaMessageId }],
      });

      if (!existingMessage) {
        await Message.create({
          companyId: company._id,
          conversationId: conversation._id,
          metaMessageId,
          wamid: metaMessageId,
          direction: 'inbound',
          senderType: 'customer',
          sender: {
            name: customerName,
            type: 'customer',
          },
          messageType,
          type: messageType,
          messageBody,
          body: messageBody,
          mediaUrl,
          mediaCaption,
          filename,
          location: locationData,
          contactCard: contactCardData,
          deliveryStatus: 'delivered',
          status: 'delivered',
          timestamp: new Date(),
        });

        logWhatsAppTrace({
          traceId,
          stage: 'MESSAGE_SAVED',
          companyId: company._id,
          phoneNumberId,
          waId,
          messageId: metaMessageId,
          durationMs: Date.now() - webhookStart,
        });

        // Update Conversation Last Message & Unread Count
        conversation.lastMessage = messageBody;
        conversation.lastMessageType = messageType;
        conversation.lastMessageAt = new Date();
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        await conversation.save();

        logWhatsAppTrace({
          traceId,
          stage: 'CONVERSATION_UPDATED',
          companyId: company._id,
          phoneNumberId,
          waId,
          messageId: metaMessageId,
          durationMs: Date.now() - webhookStart,
          metadata: { conversationId: conversation._id.toString() },
        });

        // ─── AWAIT DOWNSTREAM ENGINES (Guarantees Vercel Serverless Execution) ───
        logWhatsAppTrace({
          traceId,
          stage: 'ENGINES_EXECUTION_STARTED',
          companyId: company._id,
          phoneNumberId,
          waId,
          messageId: metaMessageId,
          durationMs: Date.now() - webhookStart,
        });

        const engineResults = await Promise.allSettled([
          triggerChatbotEngine({
            company,
            conversation,
            contact,
            incomingText: messageBody,
            messageType,
            traceId,
            webhookStart,
          }),
          triggerAutomationEngine({
            company,
            conversation,
            contact,
            incomingText: messageBody,
            messageType,
            wamid: metaMessageId,
            traceId,
            webhookStart,
          }),
        ]);

        engineResults.forEach((res, idx) => {
          if (res.status === 'rejected') {
            logWhatsAppError({
              traceId,
              stage: idx === 0 ? 'CHATBOT_ENGINE_FAILED' : 'AUTOMATION_ENGINE_FAILED',
              companyId: company._id,
              phoneNumberId,
              waId,
              messageId: metaMessageId,
              errorCode: 'ENGINE_REJECTED',
              errorMessage: res.reason?.message || String(res.reason),
              durationMs: Date.now() - webhookStart,
            });
          }
        });
        // ──────────────────────────────────────────────────────────────────────────
      }

      await WebhookLog.create({
        companyId: company._id,
        phoneNumberId: phoneNumberId || '',
        eventType: 'message_received',
        payload: body,
        status: 'PROCESSED',
      });

      logWhatsAppTrace({
        traceId,
        stage: 'WEBHOOK_COMPLETED',
        companyId: company._id,
        phoneNumberId,
        waId,
        messageId: metaMessageId,
        durationMs: Date.now() - webhookStart,
      });
    }

    return res.status(200).json({ status: 'EVENT_RECEIVED' });
  } catch (error) {
    logWhatsAppError({
      traceId: req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id ? `WHATSAPP_${req.body.entry[0].changes[0].value.messages[0].id}` : 'WHATSAPP_UNKNOWN',
      stage: 'WEBHOOK_FATAL_ERROR',
      errorCode: 'WEBHOOK_EXCEPTION',
      errorMessage: error.message,
      durationMs: Date.now() - webhookStart,
    });
    try {
      await WebhookLog.create({
        companyId: null,
        phoneNumberId: '',
        eventType: 'error',
        payload: req.body,
        status: 'FAILED',
        errorMessage: error.message,
      });
    } catch (e) {
      // Ignore
    }
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Fetch Webhook Inspection Audit Logs
 */
export const getWebhookLogs = async (req, res) => {
  try {
    await connectDB();
    const logs = await WebhookLog.find({ companyId: req.company._id })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch webhook logs' });
  }
};
