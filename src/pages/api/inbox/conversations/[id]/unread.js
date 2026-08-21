import { markAsUnread } from '@/controllers/inboxController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'PUT' || req.method === 'POST') {
    return markAsUnread(req, res);
  }
  res.setHeader('Allow', ['PUT', 'POST']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
