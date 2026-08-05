import { startEmbeddedSignup } from '@/controllers/metaEmbeddedController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'POST' || req.method === 'GET') {
    return startEmbeddedSignup(req, res);
  }
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
