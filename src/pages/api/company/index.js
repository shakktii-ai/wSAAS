import { getCompanyDetails, updateCompanyDetails } from '@/controllers/companyController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'GET') {
    return getCompanyDetails(req, res);
  }
  if (req.method === 'PUT') {
    return updateCompanyDetails(req, res);
  }
  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
