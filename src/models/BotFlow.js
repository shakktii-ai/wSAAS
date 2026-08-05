import mongoose from 'mongoose';

const BotFlowSchema = new mongoose.Schema(
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
    triggerKeyword: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
      index: true,
    },
    nodes: [
      {
        id: { type: String, required: true },
        type: {
          type: String,
          enum: ['text', 'buttons', 'list', 'quick_reply', 'condition', 'variable', 'media', 'webhook', 'api'],
          required: true,
        },
        title: { type: String, default: '' },
        content: { type: String, default: '' },
        mediaUrl: { type: String, default: '' },
        buttons: [{ id: String, title: String, nextNodeId: String }],
        listItems: [{ id: String, title: String, description: String, nextNodeId: String }],
        condition: {
          variableName: String,
          operator: { type: String, enum: ['equals', 'contains', 'starts_with'], default: 'equals' },
          value: String,
          trueNextNodeId: String,
          falseNextNodeId: String,
        },
        webhookUrl: { type: String, default: '' },
        nextNodeId: { type: String, default: '' },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    executionCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.BotFlow || mongoose.model('BotFlow', BotFlowSchema);
