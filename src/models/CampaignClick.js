import mongoose from 'mongoose';

/**
 * CampaignClick — persists every click on a broadcast tracking URL.
 *
 * Unique-click definition:
 *   - If contactId is known   → unique per (broadcastId + contactId).
 *   - If contactId is unknown → unique per (broadcastId + ipFingerprint).
 *
 * CTR = (uniqueClicks / broadcast.stats.sent) * 100
 */
const CampaignClickSchema = new mongoose.Schema(
  {
    /** Nanoid-style short ID embedded in the redirect URL */
    trackingId: {
      type: String,
      required: true,
      unique: true,
    },
    broadcastId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Broadcast',
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    /** Populated when the click can be correlated to a known contact */
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
    },
    phone: {
      type: String,
      default: '',
    },
    /** The real destination URL the user is redirected to */
    destinationUrl: {
      type: String,
      required: true,
    },
    /** Timestamp of the actual click */
    clickedAt: {
      type: Date,
      default: null,
    },
    userAgent: {
      type: String,
      default: '',
    },
    /** Hashed IP (SHA-256) for privacy-compliant anonymous uniqueness */
    ipFingerprint: {
      type: String,
      default: '',
    },
    /**
     * true  → first click from this contact/ip on this campaign (counts toward uniqueClicks)
     * false → subsequent click (still recorded for total clicks)
     * null  → not yet evaluated (record just created, never clicked)
     */
    isUnique: {
      type: Boolean,
      default: null,
    },
    /** Number of times THIS specific tracking link has been clicked */
    clickCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Unique-click check: has this contact already clicked this campaign?
CampaignClickSchema.index({ broadcastId: 1, contactId: 1 });

// Anonymous unique-click check: has this IP+UA already clicked?
CampaignClickSchema.index({ broadcastId: 1, ipFingerprint: 1 });

// Analytics queries: all clicks for a campaign, sorted newest first
CampaignClickSchema.index({ broadcastId: 1, companyId: 1, clickedAt: -1 });

export default mongoose.models.CampaignClick || mongoose.model('CampaignClick', CampaignClickSchema);
