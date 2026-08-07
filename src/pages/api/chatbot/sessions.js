import connectDB from '@/lib/db';
import BotSession from '@/models/BotSession';
import { withAuth } from '@/lib/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

/**
 * GET  /api/chatbot/sessions        – List active bot sessions
 * DELETE /api/chatbot/sessions      – Clear all sessions for company (emergency stop)
 */
async function handler(req, res) {
  try {
    await connectDB();
    const companyId = req.company._id;

    if (req.method === 'GET') {
      const sessions = await BotSession.find({ companyId, isActive: true })
        .sort({ updatedAt: -1 })
        .limit(50)
        .populate('botFlowId', 'name triggerKeyword')
        .lean();

      return successResponse(res, { sessions, total: sessions.length });
    }

    if (req.method === 'DELETE') {
      await BotSession.updateMany({ companyId, isActive: true }, { isActive: false });
      return successResponse(res, null, 'All active chatbot sessions terminated');
    }

    res.setHeader('Allow', ['GET', 'DELETE']);
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  } catch (err) {
    return errorResponse(res, 'Failed to manage sessions', 500);
  }
}

export default withAuth(handler);
