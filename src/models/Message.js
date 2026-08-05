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
      enum: ['text', 'image', 'video', 'document', 'audio', 'template', 'button_reply', 'interactive'],
      default: 'text',
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'document', 'audio', 'template', 'button_reply', 'interactive'],
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
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
