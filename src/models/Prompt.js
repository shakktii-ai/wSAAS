import mongoose from 'mongoose';

const PromptSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ['system', 'sales', 'support', 'billing', 'marketing'],
      default: 'support',
    },
    promptText: {
      type: String,
      required: true,
    },
    tone: {
      type: String,
      default: 'Professional & Helpful',
    },
    language: {
      type: String,
      default: 'en_US',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

PromptSchema.index({ companyId: 1, type: 1 });

export default mongoose.models.Prompt || mongoose.model('Prompt', PromptSchema);
