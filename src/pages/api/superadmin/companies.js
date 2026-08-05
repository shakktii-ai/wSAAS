import { getAllCompanies, toggleCompanyStatus } from '@/controllers/superadminController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'GET') {
    return getAllCompanies(req, res);
  }
  if (req.method === 'PUT') {
    return toggleCompanyStatus(req, res);
  }
  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler, { roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] });
