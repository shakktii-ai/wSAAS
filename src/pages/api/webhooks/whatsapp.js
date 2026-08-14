import { verifyWebhook, handleWebhookEvent } from '@/controllers/webhookController';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    console.log('[Meta Webhook Verification GET]', req.query);
    return verifyWebhook(req, res);
  }
  if (req.method === 'POST') {
    console.log('[WHATSAPP WEBHOOK POST RECEIVED]', {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type'],
    });

    console.log('[WHATSAPP WEBHOOK BODY RECEIVED]', {
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
    });

    console.log('[Meta Webhook Inbound POST]', JSON.stringify(req.body, null, 2));
    return handleWebhookEvent(req, res);
  }
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}
