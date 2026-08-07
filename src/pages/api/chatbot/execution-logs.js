import connectDB from '@/lib/db';
import BotExecutionLog from '@/models/BotExecutionLog';
import BotSession from '@/models/BotSession';
import { withAuth } from '@/lib/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

/**
 * GET /api/chatbot/execution-logs
 * Returns chatbot execution logs for the authenticated company
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  try {
    await connectDB();
    const companyId = req.company._id;
    const { page = 1, limit = 20, status } = req.query;

    const filter = { companyId };
    if (status) filter.status = status.toUpperCase();

    const [logs, total] = await Promise.all([
      BotExecutionLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .populate('botFlowId', 'name triggerKeyword')
        .lean(),
      BotExecutionLog.countDocuments(filter),
    ]);

    const activeSessions = await BotSession.countDocuments({ companyId, isActive: true, isPaused: false });

    return successResponse(res, {
      logs,
      total,
      activeSessions,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch execution logs', 500);
  }
}

export default withAuth(handler);
