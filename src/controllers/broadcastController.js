import connectDB from '@/lib/db';
import Broadcast from '@/models/Broadcast';
import Contact from '@/models/Contact';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import { sendMetaTemplate } from '@/lib/metaWhatsAppService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const getBroadcasts = async (req, res) => {
  try {
    await connectDB();
    const broadcasts = await Broadcast.find({ companyId: req.company._id }).sort({ createdAt: -1 });
    return successResponse(res, broadcasts);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch broadcasts', 500);
  }
};

export const createBroadcast = async (req, res) => {
  try {
    await connectDB();
    const { name, templateName, languageCode, targetType, targetValue, scheduledAt } = req.body;
    const companyId = req.company._id;

    if (!name || !templateName) {
      return errorResponse(res, 'Broadcast campaign name and template name are required', 400);
    }

    const broadcast = await Broadcast.create({
      companyId,
      name,
      templateName,
      languageCode: languageCode || 'en_US',
      targetType: targetType || 'all',
      targetValue: targetValue || '',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      status: 'SCHEDULED',
      createdBy: req.user._id,
    });

    return successResponse(res, broadcast, 'Broadcast campaign created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create broadcast campaign', 500);
  }
};

export const executeBroadcast = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const company = req.company;

    if (!company.whatsappConfig || company.whatsappConfig.status !== 'CONNECTED') {
      return errorResponse(res, 'WhatsApp Business Account is not connected', 400);
    }

    const { phoneNumberId, accessToken } = company.whatsappConfig;

    const broadcast = await Broadcast.findOne({ _id: id, companyId: company._id });
    if (!broadcast) {
      return errorResponse(res, 'Broadcast campaign not found', 404);
    }

    broadcast.status = 'PROCESSING';
    broadcast.startedAt = new Date();
    await broadcast.save();

    // Target Audience Query
    const query = { companyId: company._id, status: 'active' };
    if (broadcast.targetType === 'group' && broadcast.targetValue) {
      query.groups = broadcast.targetValue;
    } else if (broadcast.targetType === 'tag' && broadcast.targetValue) {
      query.tags = broadcast.targetValue;
    }

    const targetContacts = await Contact.find(query);

    let sent = 0;
    let failed = 0;

    for (const contact of targetContacts) {
      try {
        const cleanPhone = contact.phone.replace(/[^0-9]/g, '');

        const metaResult = await sendMetaTemplate({
          phoneNumberId,
          accessToken,
          to: cleanPhone,
          templateName: broadcast.templateName,
          languageCode: broadcast.languageCode,
        });

        const wamid = metaResult?.messages?.[0]?.id || `wamid.bcast.${Date.now()}`;

        // Find/Create conversation
        let conversation = await Conversation.findOne({ companyId: company._id, customerPhone: cleanPhone });
        if (!conversation) {
          conversation = await Conversation.create({
            companyId: company._id,
            customerPhone: cleanPhone,
            customerName: contact.name,
            status: 'active',
          });
        }

        await Message.create({
          companyId: company._id,
          conversationId: conversation._id,
          wamid,
          direction: 'outbound',
          type: 'template',
          body: `[Broadcast Template: ${broadcast.templateName}]`,
          templateName: broadcast.templateName,
          status: 'sent',
          sender: { id: req.user._id, name: req.user.name, type: 'user' },
        });

        conversation.lastMessage = `[Broadcast: ${broadcast.templateName}]`;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        sent++;
      } catch (err) {
        console.error(`Broadcast dispatch error for ${contact.phone}:`, err);
        failed++;
      }
    }

    broadcast.status = 'COMPLETED';
    broadcast.completedAt = new Date();
    broadcast.stats = {
      total: targetContacts.length,
      sent,
      delivered: sent, // Updated asynchronously via webhooks
      read: 0,
      failed,
    };

    await broadcast.save();

    return successResponse(res, broadcast, `Broadcast dispatched to ${sent} contacts (${failed} failed)`);
  } catch (error) {
    console.error('Execute Broadcast Error:', error);
    return errorResponse(res, 'Failed to execute broadcast campaign', 500);
  }
};
