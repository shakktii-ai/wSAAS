/**
 * GET /api/track/click/:trackingId
 *
 * PUBLIC endpoint — no authentication required.
 * The user's browser follows this URL after clicking a button/link
 * in a WhatsApp broadcast message.
 *
 * Records the click in MongoDB and redirects to the real destination URL.
 */
import { handleClickTracking } from '@/controllers/trackingController';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
  return handleClickTracking(req, res);
}
