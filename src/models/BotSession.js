import mongoose from 'mongoose';

/**
 * BotSession – tracks per-contact chatbot session state for button/condition flows
 */
const BotSessionSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', index: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', index: true },
    botFlowId: { type: mongoose.Schema.Types.ObjectId, ref: 'BotFlow', required: true },
    customerPhone: { type: String, required: true, index: true },
    currentNodeId: { type: String, default: '' },
    variables: { type: mongoose.Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true, index: true },
    isPaused: { type: Boolean, default: false }, // Paused for human handoff
    pausedReason: { type: String, default: '' },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 60 * 60 * 1000) }, // 1 hour
  },
  { timestamps: true }
);

BotSessionSchema.index({ companyId: 1, customerPhone: 1, isActive: 1 });

export default mongoose.models.BotSession || mongoose.model('BotSession', BotSessionSchema);
