import mongoose from 'mongoose';

const AgentActivitySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    activityType: {
      type: String,
      enum: ['STATUS_CHANGE', 'LOGIN', 'LOGOUT', 'CHAT_ASSIGNED', 'CHAT_RESOLVED'],
      required: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'away', 'busy'],
      default: 'online',
    },
    details: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

AgentActivitySchema.index({ companyId: 1, agentId: 1, createdAt: -1 });

export default mongoose.models.AgentActivity || mongoose.model('AgentActivity', AgentActivitySchema);
