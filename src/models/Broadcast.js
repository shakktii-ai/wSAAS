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
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'PROCESSING', 'PAUSED', 'COMPLETED', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },
    stats: {
      total: { type: Number, default: 0 },
      queued: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    rates: {
      deliveryRate: { type: Number, default: 0 },
      readRate: { type: Number, default: 0 },
      ctr: { type: Number, default: 0 },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    startedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

BroadcastSchema.index({ companyId: 1, status: 1, createdAt: -1 });

export default mongoose.models.Broadcast || mongoose.model('Broadcast', BroadcastSchema);
