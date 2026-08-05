import { verifyWebhook, handleWebhookEvent } from '@/controllers/webhookController';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return verifyWebhook(req, res);
  }
  if (req.method === 'POST') {
    console.log('Incoming Meta Webhook POST Body:', JSON.stringify(req.body, null, 2));
    return handleWebhookEvent(req, res);
  }
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}
