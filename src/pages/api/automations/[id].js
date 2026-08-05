import { getAutomationDetails, updateAutomationCanvas, deleteAutomation } from '@/controllers/automationController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'GET') {
    return getAutomationDetails(req, res);
  }
  if (req.method === 'PUT' || req.method === 'PATCH') {
    return updateAutomationCanvas(req, res);
  }
  if (req.method === 'DELETE') {
    return deleteAutomation(req, res);
  }
  res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
