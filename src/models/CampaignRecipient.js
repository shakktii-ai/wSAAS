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
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'pending', 'sending', 'sent', 'delivered', 'read', 'failed', 'sending_unknown', 'cancelled'],
      default: 'pending',
      index: true,
    },
    sendingLockedAt: {
      type: Date,
      default: null,
    },
    workerId: {
      type: String,
      default: null,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    metaMessageId: String,
    errorMessage:  String,
    sentAt:        Date,
    deliveredAt:   Date,
    readAt:        Date,

    // ── Click tracking fields ─────────────────────────────────────────────────
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

    // ── Quick Reply button tracking fields ──────────────────────────────────
    buttonClicked: {
      type: Boolean,
      default: false,
    },
    buttonResponse: {
      type: String,
      default: '',
    },
    buttonClickedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

CampaignRecipientSchema.index({ companyId: 1, broadcastId: 1, status: 1 });
CampaignRecipientSchema.index({ broadcastId: 1, contactId: 1 });
CampaignRecipientSchema.index({ status: 1, sendingLockedAt: 1 });

export default mongoose.models.CampaignRecipient || mongoose.model('CampaignRecipient', CampaignRecipientSchema);
