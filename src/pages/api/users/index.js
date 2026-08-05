import { getCompanyUsers, createCompanyUser } from '@/controllers/userController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'GET') {
    return getCompanyUsers(req, res);
  }
  if (req.method === 'POST') {
    return createCompanyUser(req, res);
  }
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
