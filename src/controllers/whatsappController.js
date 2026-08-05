import connectDB from '@/lib/db';
import Company from '@/models/Company';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import { sendMetaText, sendMetaMedia, sendMetaTemplate } from '@/lib/metaWhatsAppService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const sendMessage = async (req, res) => {
  try {
    await connectDB();
    const { to, type, body, mediaUrl, mediaCaption, filename, templateName, languageCode, components } = req.body;

    if (!to || !type) {
      return errorResponse(res, 'Recipient phone number (to) and message type are required', 400);
    }

    const phoneNumberId = company?.whatsappConfig?.phoneNumberId || process.env.META_PHONE_NUMBER_ID;
    const accessToken = company?.whatsappConfig?.accessToken || process.env.META_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return errorResponse(res, 'WhatsApp Business Account credentials (Phone Number ID / Access Token) not configured', 400);
    }
    const cleanPhone = to.replace(/[^0-9]/g, '');

    // Find or create active conversation
    let conversation = await Conversation.findOne({
      companyId: company._id,
      customerPhone: cleanPhone,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        companyId: company._id,
        customerPhone: cleanPhone,
        customerName: cleanPhone,
        status: 'active',
      });
    }

    let metaResult = null;
    let messageBody = body || '';

    // Execute Meta Cloud API call based on message type
    switch (type) {
      case 'text':
        if (!body) return errorResponse(res, 'Message text body is required', 400);
        metaResult = await sendMetaText({ phoneNumberId, accessToken, to: cleanPhone, text: body });
        break;

      case 'image':
      case 'video':
      case 'document':
      case 'audio':
        if (!mediaUrl) return errorResponse(res, 'Media URL is required', 400);
        metaResult = await sendMetaMedia({
          phoneNumberId,
          accessToken,
          to: cleanPhone,
          type,
          mediaUrl,
          caption: mediaCaption,
          filename,
        });
        messageBody = mediaCaption || `[${type.toUpperCase()} Attachment]`;
        break;

      case 'template':
        if (!templateName) return errorResponse(res, 'Template name is required', 400);
        metaResult = await sendMetaTemplate({
          phoneNumberId,
          accessToken,
          to: cleanPhone,
          templateName,
          languageCode: languageCode || 'en_US',
          components: components || [],
        });
        messageBody = `[Template: ${templateName}]`;
        break;

      default:
        return errorResponse(res, `Unsupported message type: ${type}`, 400);
    }

    const wamid = metaResult?.messages?.[0]?.id || `wamid.out.${Date.now()}`;

    // Store outbound message in MongoDB
    const newMessage = await Message.create({
      companyId: company._id,
      conversationId: conversation._id,
      wamid,
      direction: 'outbound',
      type,
      body: messageBody,
      mediaUrl: mediaUrl || '',
      mediaCaption: mediaCaption || '',
      filename: filename || '',
      templateName: templateName || '',
      status: 'sent',
      sender: {
        id: req.user._id,
        name: req.user.name,
        type: 'user',
      },
    });

    // Update Conversation Last Message
    conversation.lastMessage = messageBody;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    return successResponse(
      res,
      {
        message: newMessage,
        metaResult,
      },
      'Message sent successfully'
    );
  } catch (error) {
    console.error('Send Message Controller Error:', error);
    return errorResponse(res, error.message || 'Failed to send WhatsApp message', 500);
  }
};
