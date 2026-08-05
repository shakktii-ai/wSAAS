import mongoose from 'mongoose';

const WebhookLogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true,
    },
    phoneNumberId: {
      type: String,
      default: '',
    },
    eventType: {
      type: String,
      default: 'unknown',
      index: true,
    },
    payload: {
      type: Object,
      required: true,
    },
    status: {
      type: String,
      enum: ['PROCESSED', 'FAILED', 'UNMATCHED'],
      default: 'PROCESSED',
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.WebhookLog || mongoose.model('WebhookLog', WebhookLogSchema);
