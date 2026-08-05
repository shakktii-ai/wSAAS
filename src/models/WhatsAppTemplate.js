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
      enum: ['APPROVED', 'PENDING', 'REJECTED', 'PAUSED'],
      default: 'APPROVED',
      index: true,
    },
    components: {
      type: Array,
      default: [],
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
