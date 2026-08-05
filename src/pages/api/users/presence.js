import { updatePresence } from '@/controllers/teamController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'POST' || req.method === 'PUT') {
    return updatePresence(req, res);
  }
  res.setHeader('Allow', ['POST', 'PUT']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
