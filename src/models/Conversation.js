import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    waId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    phoneNumberId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    wabaId: {
      type: String,
      default: '',
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    customerName: {
      type: String,
      default: '',
    },
    lastMessage: {
      type: String,
      default: '',
    },
    lastMessageType: {
      type: String,
      enum: ['text', 'image', 'video', 'document', 'audio', 'template', 'interactive', 'button_reply'],
      default: 'text',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastCustomerMessageAt: {
      type: Date,
      default: null,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'active', 'archived'],
      default: 'open',
      index: true,
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    internalNotes: [
      {
        authorName: String,
        authorId: mongoose.Schema.Types.ObjectId,
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ companyId: 1, waId: 1 }, { unique: true });
ConversationSchema.index({ companyId: 1, lastMessageAt: -1 });
ConversationSchema.index({ companyId: 1, customerName: 1 });
ConversationSchema.index({ companyId: 1, customerPhone: 1 });

export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
