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
    tags: {
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
    status: {
      type: String,
      enum: ['active', 'blocked', 'unsubscribed'],
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
    conversationCount: {
      type: Number,
      default: 1,
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

export default mongoose.models.Contact || mongoose.model('Contact', ContactSchema);
