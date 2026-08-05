import connectDB from '@/lib/db';
import User from '@/models/User';
import Conversation from '@/models/Conversation';
import AgentActivity from '@/models/AgentActivity';
import ConversationAssignment from '@/models/ConversationAssignment';
import Notification from '@/models/Notification';
import AuditLog from '@/models/AuditLog';
import { successResponse, errorResponse } from '@/lib/apiResponse';

/**
 * GET /api/users - Fetch Team Agents & Presence Metrics
 */
export const getTeamAgents = async (req, res) => {
  try {
    await connectDB();
    const companyId = req.company._id;

    const agents = await User.find({ companyId })
      .select('-password')
      .sort({ presence: 1, name: 1 });

    const totalAgents = agents.length;
    const onlineAgents = agents.filter((a) => a.presence === 'online').length;
    const busyAgents = agents.filter((a) => a.presence === 'busy').length;

    return successResponse(res, {
      agents,
      summary: {
        totalAgents,
        onlineAgents,
        busyAgents,
      },
    });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch team agents', 500);
  }
};

/**
 * POST /api/users/presence - Update Agent Presence (Online, Offline, Away, Busy)
 */
export const updatePresence = async (req, res) => {
  try {
    await connectDB();
    const { presence } = req.body;
    const userId = req.user._id;
    const companyId = req.company._id;

    if (!['online', 'offline', 'away', 'busy'].includes(presence)) {
      return errorResponse(res, 'Invalid presence choice', 400);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { presence, lastSeen: new Date() },
      { new: true }
    ).select('-password');

    await AgentActivity.create({
      companyId,
      agentId: userId,
      activityType: 'STATUS_CHANGE',
      status: presence,
      details: `Presence updated to ${presence}`,
    });

    return successResponse(res, user, `Presence status updated to ${presence}`);
  } catch (error) {
    return errorResponse(res, 'Failed to update presence status', 500);
  }
};

/**
 * POST /api/inbox/conversations/[id]/transfer - Reassign / Transfer Conversation to Agent
 */
export const transferConversation = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query; // Conversation ID
    const { targetAgentId, reason = 'Agent Transfer' } = req.body;
    const companyId = req.company._id;

    const conversation = await Conversation.findOne({ _id: id, companyId });
    if (!conversation) {
      return errorResponse(res, 'Conversation not found', 404);
    }

    const targetAgent = await User.findOne({ _id: targetAgentId, companyId });
    if (!targetAgent) {
      return errorResponse(res, 'Target agent not found', 404);
    }

    const previousAgentId = conversation.assignedAgent || conversation.assignedAgentId;

    // Update Conversation Owner
    conversation.assignedAgent = targetAgent._id;
    conversation.assignedAgentId = targetAgent._id;
    await conversation.save();

    // Update Agent Active Chat Counters
    if (previousAgentId) {
      await User.findByIdAndUpdate(previousAgentId, { $inc: { activeChatsCount: -1 } });
    }
    await User.findByIdAndUpdate(targetAgent._id, { $inc: { activeChatsCount: 1, totalChatsCount: 1 } });

    // Log Transfer History
    await ConversationAssignment.create({
      companyId,
      conversationId: id,
      previousAgentId,
      newAgentId: targetAgent._id,
      transferredById: req.user._id,
      reason,
      assignmentType: 'MANUAL',
    });

    // Create Agent Notification Alert
    await Notification.create({
      companyId,
      userId: targetAgent._id,
      title: 'New Chat Assigned',
      message: `${req.user.name} transferred ${conversation.customerName}'s chat to you.`,
      type: 'ASSIGNMENT',
      link: `/dashboard/inbox?id=${id}`,
    });

    // Audit Trail
    await AuditLog.create({
      companyId,
      userId: req.user._id,
      action: 'CONVERSATION_TRANSFERRED',
      details: `Transferred chat ${conversation.customerName} to ${targetAgent.name}`,
    });

    return successResponse(res, conversation, `Chat transferred to ${targetAgent.name}`);
  } catch (error) {
    console.error('Transfer Error:', error);
    return errorResponse(res, 'Failed to transfer conversation', 500);
  }
};

/**
 * GET /api/notifications - Fetch Notifications for Current User
 */
export const getNotifications = async (req, res) => {
  try {
    await connectDB();
    const notifications = await Notification.find({
      companyId: req.company._id,
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      companyId: req.company._id,
      userId: req.user._id,
      isRead: false,
    });

    return successResponse(res, { notifications, unreadCount });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch notifications', 500);
  }
};

/**
 * PATCH /api/notifications/[id] - Mark Notification as Read
 */
export const markNotificationRead = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    await Notification.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { isRead: true }
    );

    return successResponse(res, null, 'Notification marked as read');
  } catch (error) {
    return errorResponse(res, 'Failed to update notification', 500);
  }
};

/**
 * GET /api/users/performance - Team Leaderboard & SLA Metrics
 */
export const getLeaderboard = async (req, res) => {
  try {
    await connectDB();
    const companyId = req.company._id;

    const agents = await User.find({ companyId })
      .select('name email avatar role department presence activeChatsCount totalChatsCount closedChatsCount avgResponseTimeSeconds performanceScore')
      .sort({ performanceScore: -1, closedChatsCount: -1 });

    return successResponse(res, agents);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch leaderboard', 500);
  }
};
