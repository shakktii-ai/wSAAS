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
    wamid: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'document', 'audio', 'template', 'button_reply', 'interactive'],
      required: true,
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
    sender: {
      id: mongoose.Schema.Types.ObjectId,
      name: String,
      type: {
        type: String,
        enum: ['user', 'customer', 'system', 'bot'],
        default: 'customer',
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
