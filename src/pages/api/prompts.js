import { getPrompts, savePrompt } from '@/controllers/aiStudioController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'GET') {
    return getPrompts(req, res);
  }
  if (req.method === 'POST') {
    return savePrompt(req, res);
  }
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
