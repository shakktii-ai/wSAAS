import connectDB from '@/lib/db';
import Conversation from '@/models/Conversation';
import Contact from '@/models/Contact';
import Message from '@/models/Message';
import User from '@/models/User';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const getConversations = async (req, res) => {
  try {
    await connectDB();
    const { status = 'all', search, agentId, page = 1, limit = 50 } = req.query;
    const companyId = req.company._id;

    const query = { companyId };

    if (status && status !== 'all') {
      if (status === 'open') {
        query.status = { $in: ['open', 'active'] };
      } else {
        query.status = status;
      }
    }

    if (agentId) {
      query.$or = [{ assignedAgent: agentId }, { assignedAgentId: agentId }];
    }

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { waId: { $regex: search, $options: 'i' } },
        { lastMessage: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const conversations = await Conversation.find(query)
      .populate('assignedAgent', 'name email avatar role')
      .populate('assignedAgentId', 'name email avatar role')
      .sort({ isPinned: -1, lastMessageAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Conversation.countDocuments(query);

    return successResponse(res, {
      conversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get Conversations Error:', error);
    return errorResponse(res, 'Failed to fetch conversations', 500);
  }
};

export const getConversationThread = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const companyId = req.company._id;

    const conversation = await Conversation.findOne({ _id: id, companyId })
      .populate('assignedAgent', 'name email avatar role')
      .populate('assignedAgentId', 'name email avatar role');

    if (!conversation) {
      return errorResponse(res, 'Conversation thread not found', 404);
    }

    // Reset unread count
    if (conversation.unreadCount > 0) {
      conversation.unreadCount = 0;
      await conversation.save();
    }

    // Fetch associated Contact profile details
    const contact = await Contact.findOne({ companyId, waId: conversation.waId || conversation.customerPhone });
    const mediaCount = await Message.countDocuments({
      conversationId: id,
      companyId,
      messageType: { $in: ['image', 'video', 'document', 'audio', 'sticker'] },
    });
    const conversationCount = await Conversation.countDocuments({
      companyId,
      $or: [{ waId: conversation.waId }, { customerPhone: conversation.customerPhone }],
    });

    const { before, limit = 50 } = req.query;
    const msgQuery = { conversationId: id, companyId };
    if (before) {
      msgQuery._id = { $lt: before };
    }

    const messages = await Message.find(msgQuery)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Sort ascending for UI thread display
    messages.reverse();

    return successResponse(res, {
      conversation,
      contact: contact
        ? {
            ...contact.toObject(),
            mediaCount,
            conversationCount,
          }
        : {
            name: conversation.customerName,
            waId: conversation.waId || conversation.customerPhone,
            phone: conversation.customerPhone,
            lastSeen: conversation.updatedAt,
            firstMessageAt: conversation.createdAt,
            mediaCount,
            conversationCount,
          },
      messages,
      hasMore: messages.length === parseInt(limit),
    });
  } catch (error) {
    console.error('Get Conversation Thread Error:', error);
    return errorResponse(res, 'Failed to load conversation thread', 500);
  }
};

export const assignAgentToConversation = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const { agentId } = req.body;

    const conversation = await Conversation.findOne({ _id: id, companyId: req.company._id });
    if (!conversation) {
      return errorResponse(res, 'Conversation not found', 404);
    }

    conversation.assignedAgent = agentId || null;
    conversation.assignedAgentId = agentId || null;
    await conversation.save();

    const updated = await Conversation.findById(id)
      .populate('assignedAgent', 'name email avatar role')
      .populate('assignedAgentId', 'name email avatar role');

    return successResponse(res, updated, 'Agent assigned successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to assign agent', 500);
  }
};

export const addInternalNote = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const { text } = req.body;

    if (!text) {
      return errorResponse(res, 'Note text is required', 400);
    }

    const conversation = await Conversation.findOne({ _id: id, companyId: req.company._id });
    if (!conversation) {
      return errorResponse(res, 'Conversation not found', 404);
    }

    conversation.internalNotes.push({
      authorName: req.user.name,
      authorId: req.user._id,
      text,
      createdAt: new Date(),
    });

    await conversation.save();

    return successResponse(res, conversation.internalNotes, 'Internal note added');
  } catch (error) {
    return errorResponse(res, 'Failed to add internal note', 500);
  }
};

export const togglePin = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;

    const conversation = await Conversation.findOne({ _id: id, companyId: req.company._id });
    if (!conversation) {
      return errorResponse(res, 'Conversation not found', 404);
    }

    conversation.isPinned = !conversation.isPinned;
    await conversation.save();

    return successResponse(res, { isPinned: conversation.isPinned }, 'Pin status toggled');
  } catch (error) {
    return errorResponse(res, 'Failed to toggle pin', 500);
  }
};

export const updateStatus = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const { status } = req.body;

    if (!['open', 'closed', 'active', 'archived'].includes(status)) {
      return errorResponse(res, 'Invalid status choice', 400);
    }

    const conversation = await Conversation.findOne({ _id: id, companyId: req.company._id });
    if (!conversation) {
      return errorResponse(res, 'Conversation not found', 404);
    }

    conversation.status = status;
    await conversation.save();

    return successResponse(res, conversation, `Conversation marked as ${status}`);
  } catch (error) {
    return errorResponse(res, 'Failed to update conversation status', 500);
  }
};

export const deleteConversation = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const companyId = req.company._id;

    const conversation = await Conversation.findOneAndDelete({ _id: id, companyId });
    if (!conversation) {
      return errorResponse(res, 'Conversation not found', 404);
    }

    await Message.deleteMany({ conversationId: id, companyId });

    return successResponse(res, null, 'Conversation deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete conversation', 500);
  }
};

export const markAsUnread = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const conversation = await Conversation.findOne({ _id: id, companyId: req.company._id });
    if (!conversation) {
      return errorResponse(res, 'Conversation not found', 404);
    }

    conversation.unreadCount = (conversation.unreadCount || 0) + 1;
    await conversation.save();

    return successResponse(res, conversation, 'Conversation marked as unread');
  } catch (error) {
    return errorResponse(res, 'Failed to mark conversation as unread', 500);
  }
};
