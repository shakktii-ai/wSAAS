import connectDB from '@/lib/db';
import Company from '@/models/Company';
import Conversation from '@/models/Conversation';
import Contact from '@/models/Contact';
import Message from '@/models/Message';
import WebhookLog from '@/models/WebhookLog';
import { triggerChatbotEngine } from '@/lib/chatbotEngine';
import { triggerAutomationEngine } from '@/lib/automationEngine';
import { socketService } from '@/lib/socketService';

/**
 * Webhook Verification Handler (GET)
 */
export const verifyWebhook = async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'syncchat_webhook_verify_token_secure_2026';

  if (mode && token) {
    if (mode === 'subscribe' && (token === expectedToken || token === 'syncchat_verify')) {
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
 */
export const handleWebhookEvent = async (req, res) => {
  try {
    await connectDB();
    const body = req.body;

    // Fast 200 OK acknowledgment to Meta Graph API
    res.status(200).json({ status: 'EVENT_RECEIVED' });

    if (!body || body.object !== 'whatsapp_business_account') {
      return;
    }

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0]?.value;

    if (!change) return;

    const phoneNumberId = change.metadata?.phone_number_id;

    // Find Tenant Company by Phone Number ID or default active company
    let company = null;
    if (phoneNumberId) {
      company = await Company.findOne({ 'whatsappConfig.phoneNumberId': phoneNumberId });
    }
    if (!company) {
      company = await Company.findOne({ status: 'active' });
    }

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

      if (company) {
        await WebhookLog.create({
          companyId: company._id,
          phoneNumberId: phoneNumberId || '',
          eventType: 'status_updated',
          payload: body,
          status: 'PROCESSED',
        });
      }
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

      if (!company) {
        console.warn(`Incoming WhatsApp message for unlinked Phone Number ID: ${phoneNumberId}`);
        await WebhookLog.create({
          companyId: null,
          phoneNumberId: phoneNumberId || '',
          eventType: 'message_received_unlinked',
          payload: body,
          status: 'UNMATCHED',
        });
        return;
      }

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
          status: 'open',
          unreadCount: 0,
        });
      } else {
        if (customerName && conversation.customerName !== customerName) {
          conversation.customerName = customerName;
        }
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

        // Update Conversation Last Message & Unread Count
        conversation.lastMessage = messageBody;
        conversation.lastMessageType = messageType;
        conversation.lastMessageAt = new Date();
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        await conversation.save();

        // ─── LIVE CHATBOT ENGINE TRIGGER ───────────────────────────────
        // Fire-and-forget: match published BotFlow triggers and execute
        // asynchronously. Webhook has already returned HTTP 200.
        triggerChatbotEngine({
          company,
          conversation,
          contact,
          incomingText: messageBody,
          messageType,
        }).catch((err) => console.error('[Webhook] ChatbotEngine trigger error:', err.message));
        // ────────────────────────────────────────────────────────────────

        // ─── LIVE AUTOMATION ENGINE TRIGGER ───────────────────────────
        // Fire-and-forget: match published AutomationFlow workflows and
        // execute node-by-node with full BullMQ + Socket.IO integration.
        triggerAutomationEngine({
          company,
          conversation,
          contact,
          incomingText: messageBody,
          messageType,
          wamid: metaMessageId,
        }).catch((err) => console.error('[Webhook] AutomationEngine trigger error:', err.message));
        // ────────────────────────────────────────────────────────────────
      }

      await WebhookLog.create({
        companyId: company._id,
        phoneNumberId: phoneNumberId || '',
        eventType: 'message_received',
        payload: body,
        status: 'PROCESSED',
      });
    }
  } catch (error) {
    console.error('Webhook Event Error:', error);
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
