import mongoose from 'mongoose';

const BroadcastSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    campaignType: {
      type: String,
      enum: ['PROMOTIONAL', 'TRANSACTIONAL', 'REENGAGEMENT'],
      default: 'PROMOTIONAL',
    },
    templateName: {
      type: String,
      required: true,
    },
    languageCode: {
      type: String,
      default: 'en_US',
    },
    headerMediaUrl: {
      type: String,
      default: '',
    },
    variables: {
      type: [String],
      default: [],
    },
    buttons: {
      type: Array,
      default: [],
    },
    targetType: {
      type: String,
      enum: ['all', 'group', 'tag', 'filter'],
      default: 'all',
    },
    targetValue: {
      type: String,
      default: '',
    },
    audienceFilter: {
      tags: [String],
      groups: [String],
      city: String,
      status: String,
      leadScoreMin: Number,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    /**
     * Status lifecycle:
     *   DRAFT       → created, not yet scheduled or sent
     *   SCHEDULED   → has a future scheduledAt, waiting for cron
     *   PROCESSING  → cron has claimed it, sending in progress (atomic lock)
     *   COMPLETED   → all messages dispatched successfully
     *   FAILED      → sending failed (see errorMessage)
     *   PAUSED      → manually paused mid-send
     *   CANCELLED   → user cancelled before it ran
     */
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'PROCESSING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },
    stats: {
      total:        { type: Number, default: 0 },
      queued:       { type: Number, default: 0 },
      sent:         { type: Number, default: 0 },
      delivered:    { type: Number, default: 0 },
      read:         { type: Number, default: 0 },
      failed:       { type: Number, default: 0 },
      /** Incremented every time any recipient clicks any tracking link in this campaign */
      totalClicks:  { type: Number, default: 0 },
      /** Incremented only on first click per unique contact/IP in this campaign */
      uniqueClicks: { type: Number, default: 0 },
      /** Quick Reply button responses tracking */
      buttonClicks:    { type: Number, default: 0 },
      acceptCount:     { type: Number, default: 0 },
      declineCount:    { type: Number, default: 0 },
      buttonBreakdown: { type: Map, of: Number, default: {} },
    },
    rates: {
      deliveryRate: { type: Number, default: 0 },
      readRate:     { type: Number, default: 0 },
      /**
       * CTR = (uniqueClicks / stats.sent) * 100
       * Recalculated and persisted on every click event.
       */
      ctr:          { type: Number, default: 0 },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    startedAt:   Date,
    completedAt: Date,

    // ── Scheduler fields ──────────────────────────────────────────────────────
    /**
     * Set by the cron scheduler (findOneAndUpdate atomic lock).
     * While non-null, other cron instances will skip this campaign.
     * Cleared after completion or failure.
     */
    lockedAt: {
      type: Date,
      default: null,
    },
    /** Human-readable error message stored on FAILED status */
    errorMessage: {
      type: String,
      default: '',
    },
    /** Number of times the scheduler has attempted to send this campaign */
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Existing index
BroadcastSchema.index({ companyId: 1, status: 1, createdAt: -1 });

// Scheduler query: find SCHEDULED campaigns whose time has come
BroadcastSchema.index({ status: 1, scheduledAt: 1, lockedAt: 1 });

export default mongoose.models.Broadcast || mongoose.model('Broadcast', BroadcastSchema);
