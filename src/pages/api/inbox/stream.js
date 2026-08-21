import { withAuth } from '@/lib/authMiddleware';
import { inboxEvents } from '@/lib/inboxEvents';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const companyId = req.company?._id?.toString();
  if (!companyId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', companyId })}\n\n`);

  const onUpdate = (eventData) => {
    if (eventData && String(eventData.companyId) === String(companyId)) {
      res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    }
  };

  inboxEvents.on('inbox_update', onUpdate);

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    inboxEvents.removeListener('inbox_update', onUpdate);
  });
}

export default withAuth(handler);
