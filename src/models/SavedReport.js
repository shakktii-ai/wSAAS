import mongoose from 'mongoose';

const SavedReportSchema = new mongoose.Schema(
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
    reportType: {
      type: String,
      enum: ['CONVERSATIONS', 'AGENT_PERFORMANCE', 'CAMPAIGNS', 'AI_USAGE', 'EXECUTIVE'],
      default: 'EXECUTIVE',
    },
    dateRange: {
      type: String,
      default: 'LAST_30_DAYS',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

SavedReportSchema.index({ companyId: 1, createdAt: -1 });

export default mongoose.models.SavedReport || mongoose.model('SavedReport', SavedReportSchema);
