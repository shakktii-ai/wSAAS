import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userName: {
      type: String,
      default: 'System',
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resource: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    details: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
