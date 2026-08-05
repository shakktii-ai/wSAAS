import { getBroadcasts, createBroadcast } from '@/controllers/broadcastController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'GET') {
    return getBroadcasts(req, res);
  }
  if (req.method === 'POST') {
    return createBroadcast(req, res);
  }
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
