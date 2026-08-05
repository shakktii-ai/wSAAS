import mongoose from 'mongoose';

const CampaignRecipientSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    broadcastId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Broadcast',
      required: true,
      index: true,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
    },
    phone: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'read', 'failed'],
      default: 'queued',
      index: true,
    },
    metaMessageId: String,
    errorMessage: String,
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
  },
  {
    timestamps: true,
  }
);

CampaignRecipientSchema.index({ companyId: 1, broadcastId: 1, status: 1 });

export default mongoose.models.CampaignRecipient || mongoose.model('CampaignRecipient', CampaignRecipientSchema);
