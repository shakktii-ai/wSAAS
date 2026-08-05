import { updateCompanyUser, deleteCompanyUser } from '@/controllers/userController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'PUT') {
    return updateCompanyUser(req, res);
  }
  if (req.method === 'DELETE') {
    return deleteCompanyUser(req, res);
  }
  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
