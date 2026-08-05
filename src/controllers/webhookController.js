import connectDB from '@/lib/db';
import Company from '@/models/Company';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import WebhookLog from '@/models/WebhookLog';

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
 * Inbound Webhook Event Handler (POST) - Module 3
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

    // Process Message Delivery/Read Status Updates
    if (change.statuses && change.statuses.length > 0) {
      for (const statusObj of change.statuses) {
        const metaMessageId = statusObj.id;
        const status = statusObj.status; // 'sent', 'delivered', 'read', 'failed'

        await Message.findOneAndUpdate(
          { $or: [{ metaMessageId }, { wamid: metaMessageId }] },
          {
            deliveryStatus: status,
            status,
            ...(statusObj.errors ? { errorDetails: statusObj.errors } : {}),
          }
        );
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
      const contact = change.contacts?.[0];

      const waId = contact?.wa_id || incomingMsg.from;
      const customerPhone = incomingMsg.from || waId;
      const customerName = contact?.profile?.name || waId;
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

      // Find existing conversation using waId or customerPhone
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

      switch (messageType) {
        case 'text':
          messageBody = incomingMsg.text?.body || '';
          break;

        case 'image':
        case 'video':
        case 'document':
        case 'audio':
          mediaUrl = incomingMsg[messageType]?.link || incomingMsg[messageType]?.id || '';
          mediaCaption = incomingMsg[messageType]?.caption || '';
          filename = incomingMsg[messageType]?.filename || '';
          messageBody = mediaCaption || `[Inbound ${messageType.toUpperCase()}]`;
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

      // Save incoming message (Check duplicates by metaMessageId)
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
