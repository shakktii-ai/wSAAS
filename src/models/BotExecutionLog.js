import mongoose from 'mongoose';

const BotExecutionLogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    botFlowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotFlow',
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
    customerPhone: { type: String, default: '' },
    triggerKeyword: { type: String, default: '' },
    triggerMessage: { type: String, default: '' },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED', 'PAUSED'],
      default: 'IN_PROGRESS',
      index: true,
    },
    currentNodeId: { type: String, default: '' },
    executedNodes: [
      {
        nodeId: String,
        nodeType: String,
        executedAt: { type: Date, default: Date.now },
        durationMs: { type: Number, default: 0 },
        output: { type: mongoose.Schema.Types.Mixed, default: {} },
        error: { type: String, default: '' },
      },
    ],
    errorMessage: { type: String, default: '' },
    totalDurationMs: { type: Number, default: 0 },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

BotExecutionLogSchema.index({ companyId: 1, botFlowId: 1, createdAt: -1 });
BotExecutionLogSchema.index({ companyId: 1, conversationId: 1 });

export default mongoose.models.BotExecutionLog || mongoose.model('BotExecutionLog', BotExecutionLogSchema);
