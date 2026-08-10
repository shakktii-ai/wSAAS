import mongoose from 'mongoose';

const WhatsAppTemplateSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    templateId: {
      type: String,
      default: '',
    },
    metaTemplateId: {
      type: String,
      default: '',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      default: 'en_US',
    },
    category: {
      type: String,
      enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
      default: 'UTILITY',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED'],
      default: 'DRAFT',
      index: true,
    },
    headerType: {
      type: String,
      enum: ['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'],
      default: 'NONE',
    },
    headerText: {
      type: String,
      default: '',
    },
    headerMediaUrl: {
      type: String,
      default: '',
    },
    bodyText: {
      type: String,
      default: '',
    },
    footerText: {
      type: String,
      default: '',
    },
    buttons: {
      type: Array,
      default: [],
    },
    variables: {
      type: Array,
      default: [],
    },
    components: {
      type: Array,
      default: [],
    },
    rejection: {
      reason: { type: String, default: '' },
      category: { type: String, default: '' },
      suggestedFix: { type: String, default: '' },
    },
    version: {
      type: Number,
      default: 1,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    syncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

WhatsAppTemplateSchema.index({ companyId: 1, name: 1, language: 1 }, { unique: true });

export default mongoose.models.WhatsAppTemplate || mongoose.model('WhatsAppTemplate', WhatsAppTemplateSchema);

