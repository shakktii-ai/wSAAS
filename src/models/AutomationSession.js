import mongoose from 'mongoose';

/**
 * AutomationSession — tracks per-contact, per-flow execution state.
 * Supports resume-after-delay via BullMQ.
 */
const AutomationSessionSchema = new mongoose.Schema(
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
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      index: true,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      index: true,
    },
    waId: {
      type: String,
      required: true,
      index: true,
    },
    customerPhone: { type: String, default: '' },
    currentNodeId: { type: String, default: '' },
    status: {
      type: String,
      enum: ['RUNNING', 'PAUSED', 'COMPLETED', 'FAILED'],
      default: 'RUNNING',
      index: true,
    },
    pausedForDelay: { type: Boolean, default: false },
    delayJobId: { type: String, default: '' },         // BullMQ job ID for resume
    variables: { type: mongoose.Schema.Types.Mixed, default: {} },
    triggerMessage: { type: String, default: '' },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    errorMessage: { type: String, default: '' },
  },
  { timestamps: true }
);

AutomationSessionSchema.index({ companyId: 1, waId: 1, status: 1 });
AutomationSessionSchema.index({ companyId: 1, flowId: 1, createdAt: -1 });

export default mongoose.models.AutomationSession || mongoose.model('AutomationSession', AutomationSessionSchema);
