import { deleteContact } from '@/controllers/contactController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'DELETE') {
    return deleteContact(req, res);
  }
  res.setHeader('Allow', ['DELETE']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
