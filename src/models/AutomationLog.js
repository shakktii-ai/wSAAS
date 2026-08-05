import mongoose from 'mongoose';

const AutomationLogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    flowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AutomationFlow',
      required: true,
      index: true,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
    },
    customerPhone: String,
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'IN_PROGRESS'],
      default: 'SUCCESS',
      index: true,
    },
    executedSteps: [
      {
        nodeId: String,
        nodeType: String,
        executedAt: Date,
        output: Object,
      },
    ],
    errorMessage: String,
    durationMs: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

AutomationLogSchema.index({ companyId: 1, flowId: 1, createdAt: -1 });

export default mongoose.models.AutomationLog || mongoose.model('AutomationLog', AutomationLogSchema);
