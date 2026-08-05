import mongoose from 'mongoose';

const ConversationAssignmentSchema = new mongoose.Schema(
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
    previousAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    newAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    transferredById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      default: 'Reassigned by agent',
    },
    assignmentType: {
      type: String,
      enum: ['MANUAL', 'ROUND_ROBIN', 'LEAST_BUSY', 'STICKY'],
      default: 'MANUAL',
    },
  },
  {
    timestamps: true,
  }
);

ConversationAssignmentSchema.index({ companyId: 1, conversationId: 1, createdAt: -1 });

export default mongoose.models.ConversationAssignment || mongoose.model('ConversationAssignment', ConversationAssignmentSchema);
