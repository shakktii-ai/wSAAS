import mongoose from 'mongoose';

const ContactGroupSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    contactCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

ContactGroupSchema.index({ companyId: 1, name: 1 }, { unique: true });

export default mongoose.models.ContactGroup || mongoose.model('ContactGroup', ContactGroupSchema);
