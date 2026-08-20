/**
 * trackingController.js
 *
 * Handles GET /api/track/click/:trackingId
 *
 * Flow:
 *  1. Look up the CampaignClick record by trackingId.
 *  2. Determine if this is a unique click:
 *       - Known contact  → unique per (broadcastId + contactId)
 *       - Anonymous      → unique per (broadcastId + ipFingerprint)
 *  3. Increment broadcast.stats.totalClicks always.
 *     Increment broadcast.stats.uniqueClicks only when isUnique = true.
 *  4. Recalculate CTR = (uniqueClicks / stats.sent) * 100
 *  5. Update the CampaignRecipient clicked flag.
 *  6. Redirect the user to the destinationUrl (302).
 *
 * Privacy note: IP addresses are SHA-256 hashed before storage.
 */

import connectDB from '@/lib/db';
import CampaignClick from '@/models/CampaignClick';
import CampaignRecipient from '@/models/CampaignRecipient';
import Broadcast from '@/models/Broadcast';
import crypto from 'crypto';

/**
 * Hash an IP address for privacy-compliant storage.
 * The hash is one-way and cannot be reversed to the original IP.
 */
function hashIp(ip) {
  return crypto.createHash('sha256').update(ip || '').digest('hex').slice(0, 32);
}

/**
 * Extract real IP, respecting common proxy headers.
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '';
}

export async function handleClickTracking(req, res) {
  await connectDB();

  const { trackingId } = req.query;

  if (!trackingId) {
    return res.redirect(302, process.env.NEXT_PUBLIC_APP_URL || '/');
  }

  // ── 1. Fetch click record ──────────────────────────────────────────────────
  const clickRecord = await CampaignClick.findOne({ trackingId });

  if (!clickRecord) {
    // Unknown tracking ID — redirect to homepage rather than 404
    return res.redirect(302, process.env.NEXT_PUBLIC_APP_URL || '/');
  }

  const destinationUrl = clickRecord.destinationUrl;

  try {
    const rawIp         = getClientIp(req);
    const ipFingerprint = hashIp(rawIp + (req.headers['user-agent'] || ''));
    const userAgent     = (req.headers['user-agent'] || '').slice(0, 512);

    // ── 2. Determine uniqueness ────────────────────────────────────────────
    let isThisClickUnique = false;

    if (clickRecord.contactId) {
      // Known contact: unique if no prior click exists from this contact
      const priorClick = await CampaignClick.findOne({
        broadcastId: clickRecord.broadcastId,
        contactId:   clickRecord.contactId,
        isUnique:    true,
        _id: { $ne: clickRecord._id },
      });
      isThisClickUnique = !priorClick;
    } else {
      // Anonymous: unique if no prior click from this IP fingerprint
      const priorClick = await CampaignClick.findOne({
        broadcastId:  clickRecord.broadcastId,
        ipFingerprint,
        isUnique:     true,
        _id: { $ne: clickRecord._id },
      });
      isThisClickUnique = !priorClick;
    }

    // ── 3 & 4. Atomic broadcast stats update ──────────────────────────────
    const broadcastUpdate = {
      $inc: { 'stats.totalClicks': 1 },
    };
    if (isThisClickUnique) {
      broadcastUpdate.$inc['stats.uniqueClicks'] = 1;
    }

    const updatedBroadcast = await Broadcast.findByIdAndUpdate(
      clickRecord.broadcastId,
      broadcastUpdate,
      { new: true }
    );

    // Recalculate CTR
    if (updatedBroadcast) {
      const sent         = updatedBroadcast.stats?.sent || 0;
      const uniqueClicks = updatedBroadcast.stats?.uniqueClicks || 0;
      const ctr          = sent > 0 ? Math.round((uniqueClicks / sent) * 10000) / 100 : 0;

      await Broadcast.findByIdAndUpdate(clickRecord.broadcastId, {
        $set: { 'rates.ctr': ctr },
      });
    }

    // ── 5. Update CampaignClick record ───────────────────────────────────
    await CampaignClick.findByIdAndUpdate(clickRecord._id, {
      $set: {
        clickedAt:    new Date(),
        userAgent,
        ipFingerprint,
        isUnique:     clickRecord.isUnique === null ? isThisClickUnique : clickRecord.isUnique,
      },
      $inc: { clickCount: 1 },
    });

    // ── 6. Update CampaignRecipient ───────────────────────────────────────
    await CampaignRecipient.findOneAndUpdate(
      { trackingId },
      {
        $set: {
          clicked:   true,
          clickedAt: new Date(),
        },
      }
    );
  } catch (err) {
    // Log but do not block the redirect — user experience takes priority
    console.error('[ClickTracking] Error recording click:', err.message);
  }

  // ── 7. Redirect ────────────────────────────────────────────────────────────
  return res.redirect(302, destinationUrl);
}
