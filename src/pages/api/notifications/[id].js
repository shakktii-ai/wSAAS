import { markNotificationRead } from '@/controllers/teamController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'PATCH' || req.method === 'PUT') {
    return markNotificationRead(req, res);
  }
  res.setHeader('Allow', ['PATCH', 'PUT']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
