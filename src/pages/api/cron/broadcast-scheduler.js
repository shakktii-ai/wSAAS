/**
 * GET /api/cron/broadcast-scheduler
 *
 * Triggered every minute by Vercel Cron (configured in vercel.json).
 * Also callable manually for testing (requires CRON_SECRET).
 *
 * Security:
 *   Vercel Cron automatically sends:
 *     Authorization: Bearer <CRON_SECRET>
 *   For manual testing pass the same header or ?secret=<CRON_SECRET>.
 *
 * Duplicate execution prevention:
 *   runScheduledBroadcasts() uses a MongoDB findOneAndUpdate atomic lock
 *   (lockedAt field). Two simultaneous invocations will never process the
 *   same campaign twice — only one will acquire the lock.
 */

import { runScheduledBroadcasts } from '@/lib/broadcastSchedulerService';

export default async function handler(req, res) {
  // Accept GET (Vercel Cron) or POST (manual trigger)
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // ── Authentication ──────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = req.headers.authorization || '';
    const querySecret = req.query.secret || '';
    const providedSecret = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : querySecret;

    if (providedSecret !== cronSecret) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  }

  // ── Run scheduler ───────────────────────────────────────────────────────
  const startTime = Date.now();

  try {
    const results = await runScheduledBroadcasts();
    const duration = Date.now() - startTime;

    console.log(`[Cron] broadcast-scheduler completed in ${duration}ms:`, results);

    return res.status(200).json({
      success: true,
      message: 'Scheduler run completed',
      data: {
        ...results,
        durationMs: duration,
        ranAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Cron] broadcast-scheduler FAILED:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Scheduler run failed',
      error: error.message,
      durationMs: duration,
    });
  }
}
