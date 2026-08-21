import { withAuth } from '@/lib/authMiddleware';
import { getContactGroups, createContactGroup } from '@/controllers/contactController';

async function handler(req, res) {
  if (req.method === 'GET') {
    return getContactGroups(req, res);
  } else if (req.method === 'POST') {
    return createContactGroup(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }
}

export default withAuth(handler);
