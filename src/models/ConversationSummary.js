import mongoose from 'mongoose';

const ConversationSummarySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
    },
    summary: {
      type: String,
      required: true,
    },
    issue: {
      type: String,
      default: 'General Customer Inquiry',
    },
    resolution: {
      type: String,
      default: 'Provided Automated Assistance',
    },
    intent: {
      type: String,
      enum: ['sales', 'support', 'complaint', 'refund', 'technical', 'billing', 'general'],
      default: 'general',
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'frustrated', 'urgent'],
      default: 'neutral',
    },
    confidenceScore: {
      type: Number,
      default: 0.95,
    },
  },
  {
    timestamps: true,
  }
);

ConversationSummarySchema.index({ companyId: 1, conversationId: 1 });

export default mongoose.models.ConversationSummary || mongoose.model('ConversationSummary', ConversationSummarySchema);
