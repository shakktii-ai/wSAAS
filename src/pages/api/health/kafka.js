import { checkKafkaHealth } from '@/lib/kafkaClient';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  try {
    const health = await checkKafkaHealth();
    const statusCode = health.status === 'HEALTHY' || health.status === 'FALLBACK_MODE' ? 200 : 503;

    return res.status(statusCode).json({
      success: statusCode === 200,
      timestamp: new Date().toISOString(),
      health,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

export default withAuth(handler);
