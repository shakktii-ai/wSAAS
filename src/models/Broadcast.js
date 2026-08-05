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
    templateName: {
      type: String,
      required: true,
    },
    languageCode: {
      type: String,
      default: 'en_US',
    },
    targetType: {
      type: String,
      enum: ['all', 'group', 'tag'],
      default: 'all',
    },
    targetValue: {
      type: String,
      default: '',
    },
    scheduledAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'PROCESSING', 'COMPLETED', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
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

export default mongoose.models.Broadcast || mongoose.model('Broadcast', BroadcastSchema);
