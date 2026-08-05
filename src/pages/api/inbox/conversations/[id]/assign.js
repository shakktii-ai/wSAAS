import { assignAgentToConversation } from '@/controllers/inboxController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'PUT') {
    return assignAgentToConversation(req, res);
  }
  res.setHeader('Allow', ['PUT']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
