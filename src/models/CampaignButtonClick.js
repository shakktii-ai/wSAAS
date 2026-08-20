import mongoose from 'mongoose';

/**
 * CampaignButtonClick — persists every Quick Reply button click
 * (e.g. Accept Job, Decline) triggered from a WhatsApp broadcast message.
 */
const CampaignButtonClickSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },
    phone: {
      type: String,
      default: '',
    },
    buttonText: {
      type: String,
      required: true,
    },
    buttonPayload: {
      type: String,
      default: '',
    },
    metaMessageId: {
      type: String,
      default: '',
      index: true,
    },
    clickedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

CampaignButtonClickSchema.index({ broadcastId: 1, contactId: 1 });
CampaignButtonClickSchema.index({ broadcastId: 1, companyId: 1, clickedAt: -1 });

export default mongoose.models.CampaignButtonClick || mongoose.model('CampaignButtonClick', CampaignButtonClickSchema);
