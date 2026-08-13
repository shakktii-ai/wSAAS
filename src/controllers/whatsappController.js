import connectDB from '@/lib/db';
import Company from '@/models/Company';
import Conversation from '@/models/Conversation';
import Contact from '@/models/Contact';
import Message from '@/models/Message';
import {
  sendMetaText,
  sendMetaMedia,
  sendMetaLocation,
  sendMetaContactCard,
  sendMetaTemplate,
  resolveWhatsAppCredentials,
} from '@/lib/metaWhatsAppService';
import { saveOutboundMessage } from '@/lib/outboundMessageService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const sendMessage = async (req, res) => {
  try {
    await connectDB();
    const company = req.company;
    const {
      to,
      conversationId: reqConversationId,
      type = 'text',
      body,
      mediaUrl,
      mediaCaption,
      filename,
      templateName,
      languageCode,
      components,
      location,
      contactCard,
    } = req.body;

    if (!to) {
      return errorResponse(res, 'Recipient phone number (to) is required', 400);
    }

    const cleanPhone = to.replace(/[^0-9]/g, '');

    // Auto-create or find Contact
    let contact = await Contact.findOne({ companyId: company._id, waId: cleanPhone });
    if (!contact) {
      contact = await Contact.create({
        companyId: company._id,
        waId: cleanPhone,
        phone: cleanPhone,
        name: cleanPhone,
        lastSeen: new Date(),
        firstMessageAt: new Date(),
      });
    }

    // Auto-create or find Conversation
    let conversation = null;
    if (reqConversationId) {
      conversation = await Conversation.findOne({ _id: reqConversationId, companyId: company._id });
    }
    if (!conversation) {
      conversation = await Conversation.findOne({
        companyId: company._id,
        $or: [{ waId: cleanPhone }, { customerPhone: cleanPhone }],
      });
    }

    // Resolve WhatsApp credentials with priority to Conversation's connected phoneNumberId
    const { resolvedPhoneNumberId, resolvedWabaId, resolvedAccessToken } = resolveWhatsAppCredentials({
      company,
      conversation,
    });

    const phoneNumberId = resolvedPhoneNumberId;
    const accessToken = resolvedAccessToken;
    const wabaId = resolvedWabaId;

    if (!phoneNumberId || !accessToken) {
      return errorResponse(res, 'WhatsApp Business Account credentials not configured', 400);
    }

    if (!conversation) {
      conversation = await Conversation.create({
        companyId: company._id,
        waId: cleanPhone,
        customerPhone: cleanPhone,
        customerName: contact.name || cleanPhone,
        phoneNumberId,
        wabaId,
        status: 'open',
      });
    } else if (!conversation.phoneNumberId) {
      conversation.phoneNumberId = phoneNumberId;
      if (wabaId && !conversation.wabaId) conversation.wabaId = wabaId;
      await conversation.save();
    }

    let metaResult = null;
    let messageBody = body || '';
    let locationData = null;
    let contactCardData = null;

    const logCtx = {
      companyId: company._id.toString(),
      conversationId: conversation._id.toString(),
      wabaId,
    };

    // Execute Meta Cloud API call based on message type
    switch (type) {
      case 'text':
        if (!body) return errorResponse(res, 'Message text body is required', 400);
        metaResult = await sendMetaText({ phoneNumberId, accessToken, to: cleanPhone, text: body, ...logCtx });
        break;

      case 'image':
      case 'video':
      case 'document':
      case 'audio':
      case 'sticker':
        if (!mediaUrl) return errorResponse(res, 'Media URL is required', 400);
        metaResult = await sendMetaMedia({
          phoneNumberId,
          accessToken,
          to: cleanPhone,
          type: type === 'sticker' ? 'image' : type,
          mediaUrl,
          caption: mediaCaption,
          filename,
          ...logCtx,
        });
        messageBody = mediaCaption || `[${type.toUpperCase()} Attachment]`;
        break;

      case 'location':
        if (!location?.latitude || !location?.longitude) {
          return errorResponse(res, 'Latitude and longitude are required for location messages', 400);
        }
        metaResult = await sendMetaLocation({
          phoneNumberId,
          accessToken,
          to: cleanPhone,
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name,
          address: location.address,
          ...logCtx,
        });
        locationData = location;
        messageBody = `📍 Location: ${location.name || `${location.latitude}, ${location.longitude}`}`;
        break;

      case 'contacts':
        if (!contactCard?.name || !contactCard?.phone) {
          return errorResponse(res, 'Contact name and phone are required', 400);
        }
        metaResult = await sendMetaContactCard({
          phoneNumberId,
          accessToken,
          to: cleanPhone,
          contactName: contactCard.name,
          contactPhone: contactCard.phone,
          ...logCtx,
        });
        contactCardData = contactCard;
        messageBody = `👤 Contact Card: ${contactCard.name} (${contactCard.phone})`;
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
          ...logCtx,
        });
        messageBody = `[Template: ${templateName}]`;
        break;

      default:
        return errorResponse(res, `Unsupported message type: ${type}`, 400);
    }

    const wamid = metaResult?.messages?.[0]?.id || `wamid.out.${Date.now()}`;

    // Store outbound message via centralized saveOutboundMessage service
    const newMessage = await saveOutboundMessage({
      companyId: company._id,
      conversationId: conversation._id,
      contactId: contact._id,
      waId: cleanPhone,
      senderType: 'agent',
      sender: {
        id: req.user._id,
        name: req.user.name,
        type: 'user',
      },
      messageType: type,
      body: messageBody,
      mediaUrl: mediaUrl || '',
      mediaCaption: mediaCaption || '',
      filename: filename || '',
      location: locationData,
      contactCard: contactCardData,
      templateName: templateName || '',
      wamid,
      metaMessageId: wamid,
      status: 'sent',
    });

    return successResponse(
      res,
      {
        message: newMessage,
        metaResult,
      },
      'Message sent successfully'
    );
  } catch (error) {
    console.error('Send Message Error:', error);
    return errorResponse(res, error.message || 'Failed to send WhatsApp message', 500);
  }
};

/**
 * Retry Failed Message
 */
export const retryMessage = async (req, res) => {
  try {
    await connectDB();
    const { messageId } = req.body;
    const msg = await Message.findOne({ _id: messageId, companyId: req.company._id });

    if (!msg) return errorResponse(res, 'Message not found', 404);

    const conversation = await Conversation.findById(msg.conversationId);
    if (!conversation) return errorResponse(res, 'Conversation thread not found', 404);

    req.body.to = conversation.waId || conversation.customerPhone;
    req.body.type = msg.messageType || msg.type;
    req.body.body = msg.messageBody || msg.body;
    req.body.mediaUrl = msg.mediaUrl;
    req.body.mediaCaption = msg.mediaCaption;

    return sendMessage(req, res);
  } catch (error) {
    return errorResponse(res, 'Failed to retry message', 500);
  }
};
