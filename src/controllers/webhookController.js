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

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'syncchat_verify_token_secure_2026';

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
 * Inbound Webhook Event Handler (POST)
 */
export const handleWebhookEvent = async (req, res) => {
  try {
    await connectDB();
    const body = req.body;

    // Fast 200 OK acknowledgment to Meta Graph API
    res.status(200).json({ status: 'EVENT_RECEIVED' });

    if (body.object !== 'whatsapp_business_account') {
      return;
    }

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0]?.value;

    if (!change) return;

    const phoneNumberId = change.metadata?.phone_number_id;
    const displayPhoneNumber = change.metadata?.display_phone_number;

    // Find Tenant Company by Phone Number ID
    let company = null;
    if (phoneNumberId) {
      company = await Company.findOne({ 'whatsappConfig.phoneNumberId': phoneNumberId });
    }

    // Process Status Updates (sent, delivered, read, failed)
    if (change.statuses && change.statuses.length > 0) {
      for (const statusObj of change.statuses) {
        const wamid = statusObj.id;
        const status = statusObj.status; // 'sent', 'delivered', 'read', 'failed'

        await Message.findOneAndUpdate(
          { wamid },
          {
            status,
            ...(statusObj.errors ? { errorDetails: statusObj.errors } : {}),
          }
        );
      }

      await WebhookLog.create({
        companyId: company ? company._id : null,
        phoneNumberId: phoneNumberId || '',
        eventType: 'status_updated',
        payload: body,
        status: 'PROCESSED',
      });
      return;
    }

    // Process Incoming Messages & Button Replies
    if (change.messages && change.messages.length > 0) {
      const incomingMsg = change.messages[0];
      const contact = change.contacts?.[0];

      const senderPhone = incomingMsg.from;
      const senderName = contact?.profile?.name || senderPhone;
      const wamid = incomingMsg.id;
      const msgType = incomingMsg.type;

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

      // Find or Create Conversation for Company Tenant
      let conversation = await Conversation.findOne({
        companyId: company._id,
        customerPhone: senderPhone,
      });

      if (!conversation) {
        conversation = await Conversation.create({
          companyId: company._id,
          customerPhone: senderPhone,
          customerName: senderName,
          status: 'active',
        });
      } else {
        if (senderName && conversation.customerName !== senderName) {
          conversation.customerName = senderName;
        }
      }

      let messageContent = '';
      let mediaUrl = '';
      let mediaCaption = '';
      let filename = '';

      switch (msgType) {
        case 'text':
          messageContent = incomingMsg.text?.body || '';
          break;

        case 'image':
        case 'video':
        case 'document':
        case 'audio':
          mediaUrl = incomingMsg[msgType]?.link || incomingMsg[msgType]?.id || '';
          mediaCaption = incomingMsg[msgType]?.caption || '';
          filename = incomingMsg[msgType]?.filename || '';
          messageContent = mediaCaption || `[Inbound ${msgType.toUpperCase()}]`;
          break;

        case 'button':
          messageContent = incomingMsg.button?.text || incomingMsg.button?.payload || '[Button Reply]';
          break;

        case 'interactive':
          if (incomingMsg.interactive?.type === 'button_reply') {
            messageContent = incomingMsg.interactive.button_reply.title || '[Interactive Button]';
          } else if (incomingMsg.interactive?.type === 'list_reply') {
            messageContent = incomingMsg.interactive.list_reply.title || '[List Reply]';
          } else {
            messageContent = '[Interactive Reply]';
          }
          break;

        default:
          messageContent = `[${msgType.toUpperCase()} Message]`;
      }

      // Check duplicate message by wamid
      const existingMessage = await Message.findOne({ wamid });
      if (!existingMessage) {
        await Message.create({
          companyId: company._id,
          conversationId: conversation._id,
          wamid,
          direction: 'inbound',
          type: msgType,
          body: messageContent,
          mediaUrl,
          mediaCaption,
          filename,
          status: 'delivered',
          sender: {
            name: senderName,
            type: 'customer',
          },
        });

        // Update Conversation Summary
        conversation.lastMessage = messageContent;
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
 * Fetch Webhook Inspection Audit Logs for Active Tenant
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
