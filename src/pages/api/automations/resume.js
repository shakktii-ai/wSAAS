/**
 * POST /api/automations/resume
 *
 * Internal endpoint called by BullMQ worker when a DELAY node has elapsed.
 * Resumes the paused AutomationSession from the nextNodeId.
 *
 * Protected by internal secret — not exposed to users.
 */
import { resumeAutomationSession } from '@/lib/automationEngine';
import connectDB from '@/lib/db';

const INTERNAL_SECRET = process.env.INTERNAL_QUEUE_SECRET || 'syncchat_queue_secret_2026';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const authHeader = req.headers['x-internal-secret'];
  if (authHeader !== INTERNAL_SECRET) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { sessionId, nextNodeId } = req.body || {};
  if (!sessionId || !nextNodeId) {
    return res.status(400).json({ success: false, message: 'sessionId and nextNodeId are required' });
  }

  try {
    await connectDB();
    // Fire-and-forget: BullMQ job ack happens immediately
    resumeAutomationSession(sessionId, nextNodeId).catch((err) =>
      console.error('[AutomationResume] Error:', err.message)
    );
    return res.status(200).json({ success: true, message: 'Session resume scheduled' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
