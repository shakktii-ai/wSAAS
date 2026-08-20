import { getBroadcast, updateBroadcast, deleteBroadcast } from '@/controllers/broadcastController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'GET')    return getBroadcast(req, res);
  if (req.method === 'PUT')    return updateBroadcast(req, res);
  if (req.method === 'DELETE') return deleteBroadcast(req, res);

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
