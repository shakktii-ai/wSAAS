import mongoose from 'mongoose';

const ContactSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    companyName: {
      type: String,
      default: '',
    },
    designation: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    state: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: '',
    },
    source: {
      type: String,
      default: 'WhatsApp',
    },
    language: {
      type: String,
      default: 'en',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    birthDate: {
      type: Date,
      default: null,
    },
    anniversary: {
      type: Date,
      default: null,
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: ['Lead'],
      index: true,
    },
    labels: {
      type: [String],
      default: [],
      index: true,
    },
    groups: {
      type: [String],
      default: [],
      index: true,
    },
    customFields: {
      type: Map,
      of: String,
      default: {},
    },
    leadScore: {
      type: Number,
      default: 50,
    },
    ownerAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'blocked', 'unsubscribed', 'archived'],
      default: 'active',
      index: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    firstMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastConversationAt: {
      type: Date,
      default: Date.now,
    },
    totalConversations: {
      type: Number,
      default: 1,
    },
    totalMessages: {
      type: Number,
      default: 1,
    },
    totalBroadcasts: {
      type: Number,
      default: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    notesCount: {
      type: Number,
      default: 0,
    },
    mediaCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

ContactSchema.index({ companyId: 1, waId: 1 }, { unique: true });
ContactSchema.index({ companyId: 1, phone: 1 });
ContactSchema.index({ companyId: 1, email: 1 });
ContactSchema.index({ companyId: 1, name: 'text', companyName: 'text', phone: 'text' });

export default mongoose.models.Contact || mongoose.model('Contact', ContactSchema);
