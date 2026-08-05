import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
      default: null, // null for global default roles
    },
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Role code is required'],
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    permissions: {
      type: [String],
      default: [],
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

RoleSchema.index({ companyId: 1, code: 1 }, { unique: true });

export default mongoose.models.Role || mongoose.model('Role', RoleSchema);
