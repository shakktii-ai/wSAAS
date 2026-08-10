import { getTemplateById, updateTemplate, deleteTemplate } from '@/controllers/templateController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'GET') {
    return getTemplateById(req, res);
  }
  if (req.method === 'PUT') {
    return updateTemplate(req, res);
  }
  if (req.method === 'DELETE') {
    return deleteTemplate(req, res);
  }
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

export default withAuth(handler);
