import mongoose from 'mongoose';

const PromptManagerSchema = new mongoose.Schema(
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
    systemPrompt: {
      type: String,
      required: true,
    },
    temperature: {
      type: Number,
      default: 0.7,
    },
    maxTokens: {
      type: Number,
      default: 500,
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

export default mongoose.models.PromptManager || mongoose.model('PromptManager', PromptManagerSchema);
