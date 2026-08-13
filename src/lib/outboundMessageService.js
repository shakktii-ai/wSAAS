import connectDB from '@/lib/db';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import Contact from '@/models/Contact';
import { socketService } from '@/lib/socketService';

/**
 * Reusable Centralized Outbound Message Persistence Helper
 * Persists outbound messages to MongoDB, updates conversation metadata, and pushes realtime Socket.IO notifications.
 */
export async function saveOutboundMessage({
  companyId,
  conversationId,
  contactId,
  phoneNumberId,
  wabaId,
  waId,
  phone,
  recipientPhone,
  to,
  direction = 'outbound',
  senderType = 'agent',
  sender,
  messageType = 'text',
  type,
  text,
  body,
  messageBody,
  mediaUrl,
  mediaCaption,
  filename,
  location,
  contactCard,
  templateName,
  wamid,
  metaMessageId,
  status = 'sent',
  createdAt,
}) {
  await connectDB();

  const finalMessageType = messageType || type || 'text';
  const rawBody = text || body || messageBody || '';
  const finalBody =
    rawBody ||
    (templateName
      ? `[Template: ${templateName}]`
      : `[${finalMessageType.toUpperCase()} Attachment]`);

  const rawPhone = to || recipientPhone || phone || waId || '';
  const cleanPhone = (rawPhone.toString() || '').replace(/[^0-9]/g, '');
  const finalWamid = metaMessageId || wamid || `wamid.out.${Date.now()}`;

  // 1. Resolve or find/create Conversation
  let conversation = null;
  if (conversationId) {
    conversation = await Conversation.findOne({ _id: conversationId, companyId });
  }

  if (!conversation && cleanPhone) {
    conversation = await Conversation.findOne({
      companyId,
      $or: [{ waId: cleanPhone }, { customerPhone: cleanPhone }],
    });
  }

  // Resolve or create Contact
  let contact = null;
  if (contactId) {
    contact = await Contact.findOne({ _id: contactId, companyId });
  }
  if (!contact && cleanPhone) {
    contact = await Contact.findOne({ companyId, waId: cleanPhone });
    if (!contact) {
      contact = await Contact.create({
        companyId,
        waId: cleanPhone,
        phone: cleanPhone,
        name: cleanPhone,
        lastSeen: new Date(),
        firstMessageAt: new Date(),
      });
    }
  }

  if (!conversation && cleanPhone) {
    conversation = await Conversation.create({
      companyId,
      waId: cleanPhone,
      customerPhone: cleanPhone,
      customerName: contact?.name || cleanPhone,
      phoneNumberId: phoneNumberId || '',
      wabaId: wabaId || '',
      status: 'open',
      lastMessage: finalBody,
      lastMessageType: finalMessageType,
      lastMessageAt: new Date(),
    });
  } else if (conversation && phoneNumberId && !conversation.phoneNumberId) {
    conversation.phoneNumberId = phoneNumberId;
    if (wabaId && !conversation.wabaId) conversation.wabaId = wabaId;
  }

  const finalConversationId = conversation?._id || conversationId;
  const finalContactId = contact?._id || contactId;
  const finalWaId = cleanPhone || conversation?.waId || conversation?.customerPhone || '';

  // Determine sender object
  let finalSenderType = senderType || 'agent';
  if (sender && typeof sender === 'object' && sender.type) {
    finalSenderType = sender.type;
  }
  if (finalSenderType === 'user') finalSenderType = 'agent';

  const finalSenderObj =
    sender && typeof sender === 'object'
      ? {
          id: sender.id || sender._id || null,
          name: sender.name || (finalSenderType === 'bot' ? 'Bot' : 'Agent'),
          type: finalSenderType,
        }
      : {
          id: null,
          name: finalSenderType === 'bot' ? 'Bot' : finalSenderType === 'automation' ? 'Automation' : 'Agent',
          type: finalSenderType,
        };

  // 2. Create Message document
  const savedMessage = await Message.create({
    companyId,
    conversationId: finalConversationId,
    contactId: finalContactId,
    waId: finalWaId,
    metaMessageId: finalWamid,
    wamid: finalWamid,
    direction: 'outbound',
    senderType: finalSenderType,
    sender: finalSenderObj,
    messageType: finalMessageType,
    type: finalMessageType,
    messageBody: finalBody,
    body: finalBody,
    text: finalBody,
    mediaUrl: mediaUrl || '',
    mediaCaption: mediaCaption || '',
    filename: filename || '',
    location: location || null,
    contactCard: contactCard || null,
    templateName: templateName || '',
    deliveryStatus: status || 'sent',
    status: status || 'sent',
    timestamp: createdAt || new Date(),
    createdAt: createdAt || new Date(),
  });

  // 3. Update Conversation metadata
  if (conversation) {
    conversation.lastMessage = finalBody;
    conversation.lastMessageType = finalMessageType;
    conversation.lastMessageDirection = 'OUTBOUND';
    conversation.lastMessageAt = new Date();
    await conversation.save();
  }

  // 4. Emit Socket.IO events for real-time Shared Inbox rendering
  socketService.broadcastToCompany(companyId.toString(), 'NEW_MESSAGE_RECEIVED', savedMessage);
  socketService.broadcastToCompany(companyId.toString(), 'MESSAGE_SENT', savedMessage);

  return savedMessage;
}
