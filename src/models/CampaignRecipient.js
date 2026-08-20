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
    errorMessage:  String,
    sentAt:        Date,
    deliveredAt:   Date,
    readAt:        Date,

    // ── Click tracking fields ─────────────────────────────────────────────────
    /**
     * The trackingId used to build the click-tracking redirect URL sent to
     * this recipient. Stored so clicks can be correlated back to a specific
     * contact without re-querying CampaignClick.
     */
    trackingId: {
      type: String,
      default: '',
    },
    clicked: {
      type: Boolean,
      default: false,
    },
    clickedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

CampaignRecipientSchema.index({ companyId: 1, broadcastId: 1, status: 1 });
CampaignRecipientSchema.index({ trackingId: 1 });

export default mongoose.models.CampaignRecipient || mongoose.model('CampaignRecipient', CampaignRecipientSchema);
