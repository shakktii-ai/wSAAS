import { getConversations } from '@/controllers/inboxController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'GET') {
    return getConversations(req, res);
  }
  res.setHeader('Allow', ['GET']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
