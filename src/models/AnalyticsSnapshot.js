import mongoose from 'mongoose';

const AnalyticsSnapshotSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    totalConversations: { type: Number, default: 0 },
    incomingMessages: { type: Number, default: 0 },
    outgoingMessages: { type: Number, default: 0 },
    avgResponseTimeSeconds: { type: Number, default: 0 },
    avgResolutionTimeMinutes: { type: Number, default: 0 },
    deliveryRate: { type: Number, default: 100 },
    readRate: { type: Number, default: 75 },
    aiAccuracy: { type: Number, default: 98.4 },
    intentDistribution: {
      type: Object,
      default: { sales: 40, support: 35, complaint: 15, billing: 10 },
    },
    sentimentDistribution: {
      type: Object,
      default: { positive: 60, neutral: 25, negative: 15 },
    },
    growthRate: { type: Number, default: 12.5 },
  },
  {
    timestamps: true,
  }
);

AnalyticsSnapshotSchema.index({ companyId: 1, date: -1 });

export default mongoose.models.AnalyticsSnapshot || mongoose.model('AnalyticsSnapshot', AnalyticsSnapshotSchema);
