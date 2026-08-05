import { resumeBroadcast } from '@/controllers/broadcastController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'POST') {
    return resumeBroadcast(req, res);
  }
  res.setHeader('Allow', ['POST']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
