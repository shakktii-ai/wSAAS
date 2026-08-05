import mongoose from 'mongoose';

const AutomationFlowSchema = new mongoose.Schema(
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
    description: {
      type: String,
      default: '',
    },
    triggerType: {
      type: String,
      enum: ['incoming_message', 'keyword', 'button_click', 'template_reply', 'new_contact', 'webhook_event'],
      default: 'keyword',
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
          enum: [
            'start',
            'message',
            'template',
            'condition',
            'delay',
            'tag_contact',
            'assign_agent',
            'webhook',
            'http_request',
            'google_sheets',
            'ai_reply',
            'end',
          ],
          required: true,
        },
        label: { type: String, default: '' },
        position: {
          x: { type: Number, default: 0 },
          y: { type: Number, default: 0 },
        },
        data: {
          type: Object,
          default: {},
        },
      },
    ],
    edges: [
      {
        id: { type: String, required: true },
        source: { type: String, required: true },
        target: { type: String, required: true },
        sourceHandle: String,
        targetHandle: String,
        label: String,
      },
    ],
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    executionStats: {
      totalExecutions: { type: Number, default: 0 },
      successful: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      dropRate: { type: Number, default: 0 },
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

AutomationFlowSchema.index({ companyId: 1, triggerKeyword: 1, status: 1 });

export default mongoose.models.AutomationFlow || mongoose.model('AutomationFlow', AutomationFlowSchema);
