import { updateBotFlow, deleteBotFlow } from '@/controllers/chatbotController';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method === 'PUT') {
    return updateBotFlow(req, res);
  }
  if (req.method === 'DELETE') {
    return deleteBotFlow(req, res);
  }
  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
