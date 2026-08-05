import mongoose from 'mongoose';

const AutomationRuleSchema = new mongoose.Schema(
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
    trigger: {
      type: {
        type: String,
        enum: ['keyword', 'new_chat', 'tag_added'],
        default: 'keyword',
      },
      value: { type: String, default: '' },
    },
    conditions: [
      {
        field: String,
        operator: String,
        value: String,
      },
    ],
    actions: [
      {
        type: {
          type: String,
          enum: ['delay', 'tag_contact', 'assign_agent', 'trigger_bot', 'webhook'],
          required: true,
        },
        value: { type: String, default: '' },
        delaySeconds: { type: Number, default: 0 },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.AutomationRule || mongoose.model('AutomationRule', AutomationRuleSchema);
