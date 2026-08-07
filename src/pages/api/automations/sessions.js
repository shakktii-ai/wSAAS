import connectDB from '@/lib/db';
import AutomationSession from '@/models/AutomationSession';
import AutomationLog from '@/models/AutomationLog';
import { withAuth } from '@/lib/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

/**
 * GET /api/automations/sessions
 * List active & historical automation sessions for the company
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  try {
    await connectDB();
    const companyId = req.company._id;
    const { page = 1, limit = 20, status, flowId } = req.query;

    const filter = { companyId };
    if (status) filter.status = status.toUpperCase();
    if (flowId) filter.flowId = flowId;

    const [sessions, total] = await Promise.all([
      AutomationSession.find(filter)
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .populate('flowId', 'name triggerType triggerKeyword')
        .populate('contactId', 'name phone waId')
        .lean(),
      AutomationSession.countDocuments(filter),
    ]);

    const activeCount = await AutomationSession.countDocuments({ companyId, status: { $in: ['RUNNING', 'PAUSED'] } });

    return successResponse(res, {
      sessions,
      total,
      activeCount,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch automation sessions', 500);
  }
}

export default withAuth(handler);
