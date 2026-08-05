import connectDB from '@/lib/db';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import User from '@/models/User';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const getConversations = async (req, res) => {
  try {
    await connectDB();
    const { status = 'active', search, agentId } = req.query;
    const companyId = req.company._id;

    const query = { companyId };

    if (status !== 'all') {
      query.status = status;
    }

    if (agentId) {
      query.assignedAgentId = agentId;
    }

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { lastMessage: { $regex: search, $options: 'i' } },
      ];
    }

    const conversations = await Conversation.find(query)
      .populate('assignedAgentId', 'name email avatar role')
      .sort({ isPinned: -1, lastMessageAt: -1 });

    return successResponse(res, conversations);
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
      .populate('assignedAgentId', 'name email avatar role');

    if (!conversation) {
      return errorResponse(res, 'Conversation thread not found', 404);
    }

    // Reset unread count
    if (conversation.unreadCount > 0) {
      conversation.unreadCount = 0;
      await conversation.save();
    }

    const messages = await Message.find({ conversationId: id, companyId })
      .sort({ createdAt: 1 });

    return successResponse(res, {
      conversation,
      messages,
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

    conversation.assignedAgentId = agentId || null;
    await conversation.save();

    const updated = await Conversation.findById(id).populate('assignedAgentId', 'name email avatar role');

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

    if (!['active', 'archived', 'closed'].includes(status)) {
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
