import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Company slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Company email is required'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: '',
    },
    logo: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending'],
      default: 'active',
      index: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'pro',
    },
    // Meta Embedded Signup Fields
    metaBusinessId: { type: String, default: '' },
    wabaId: { type: String, default: '' },
    phoneNumberId: { type: String, default: '' },
    displayPhoneNumber: { type: String, default: '' },
    businessName: { type: String, default: '' },
    accessToken: { type: String, default: '' },
    tokenType: { type: String, default: 'bearer' },
    tokenExpiry: { type: Date, default: null },
    webhookVerified: { type: Boolean, default: true },
    qualityRating: { type: String, default: 'GREEN' },
    messagingLimit: { type: String, default: 'TIER_1K' },
    isConnected: { type: Boolean, default: false },
    connectedAt: { type: Date, default: null },

    whatsappConfig: {
      phoneNumberId: { type: String, default: '' },
      wabaId: { type: String, default: '' },
      accessToken: { type: String, default: '' },
      webhookVerifyToken: { type: String, default: '' },
      displayPhoneNumber: { type: String, default: '' },
      qualityRating: { type: String, default: 'GREEN' },
      status: { type: String, enum: ['DISCONNECTED', 'CONNECTED', 'ERROR'], default: 'DISCONNECTED' },
      lastSyncedAt: { type: Date },
    },
    settings: {
      timeZone: { type: String, default: 'UTC' },
      currency: { type: String, default: 'USD' },
      autoAssignAgents: { type: Boolean, default: true },
      aiEnabled: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
