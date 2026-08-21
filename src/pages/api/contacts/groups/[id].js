import { withAuth } from '@/lib/authMiddleware';
import { deleteContactGroup } from '@/controllers/contactController';

async function handler(req, res) {
  if (req.method === 'DELETE') {
    return deleteContactGroup(req, res);
  } else {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }
}

export default withAuth(handler);
