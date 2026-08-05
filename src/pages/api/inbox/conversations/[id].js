import { getConversationThread, updateStatus } from '@/controllers/inboxController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'GET') {
    return getConversationThread(req, res);
  }
  if (req.method === 'PUT') {
    return updateStatus(req, res);
  }
  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
