import { getTemplates, createNewTemplate } from '@/controllers/templateController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'GET') {
    return getTemplates(req, res);
  }
  if (req.method === 'POST') {
    return createNewTemplate(req, res);
  }
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

export default withAuth(handler);
