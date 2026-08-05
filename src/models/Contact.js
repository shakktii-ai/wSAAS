import mongoose from 'mongoose';

const ContactSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
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
  },
  {
    timestamps: true,
  }
);

ContactSchema.index({ companyId: 1, phone: 1 }, { unique: true });

export default mongoose.models.Contact || mongoose.model('Contact', ContactSchema);
