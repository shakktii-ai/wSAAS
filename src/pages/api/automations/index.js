import { getAutomations, createAutomation } from '@/controllers/automationController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'GET') {
    return getAutomations(req, res);
  }
  if (req.method === 'POST') {
    return createAutomation(req, res);
  }
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
