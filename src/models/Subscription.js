import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['FREE', 'PRO', 'ENTERPRISE'],
      default: 'PRO',
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due'],
      default: 'active',
    },
    monthlyMessageLimit: {
      type: Number,
      default: 50000,
    },
    usedMessagesThisMonth: {
      type: Number,
      default: 12480,
    },
    contactLimit: {
      type: Number,
      default: 10000,
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);
