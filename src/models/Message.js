import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    metaMessageId: {
      type: String,
      sparse: true,
      index: true,
    },
    wamid: {
      type: String,
      sparse: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      default: 'inbound',
    },
    senderType: {
      type: String,
      enum: ['customer', 'agent', 'system'],
      default: 'customer',
    },
    sender: {
      id: mongoose.Schema.Types.ObjectId,
      name: String,
      type: {
        type: String,
        enum: ['customer', 'agent', 'user', 'system', 'bot'],
        default: 'customer',
      },
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'document', 'audio', 'location', 'contacts', 'sticker', 'template', 'button_reply', 'interactive'],
      default: 'text',
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'document', 'audio', 'location', 'contacts', 'sticker', 'template', 'button_reply', 'interactive'],
      default: 'text',
    },
    messageBody: {
      type: String,
      default: '',
    },
    body: {
      type: String,
      default: '',
    },
    mediaUrl: {
      type: String,
      default: '',
    },
    mediaCaption: {
      type: String,
      default: '',
    },
    filename: {
      type: String,
      default: '',
    },
    // Location Details
    location: {
      latitude: Number,
      longitude: Number,
      name: String,
      address: String,
    },
    // Contact Card Details
    contactCard: {
      name: String,
      phone: String,
      waId: String,
    },
    templateName: {
      type: String,
      default: '',
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending',
      index: true,
    },
    errorDetails: {
      type: Object,
      default: null,
    },
    replyToMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ companyId: 1, conversationId: 1, createdAt: -1 });
MessageSchema.index({ companyId: 1, wamid: 1 });
MessageSchema.index({ companyId: 1, metaMessageId: 1 });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
