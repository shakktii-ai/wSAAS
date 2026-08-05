import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['ASSIGNMENT', 'MENTION', 'SLA_BREACH', 'SYSTEM'],
      default: 'ASSIGNMENT',
    },
    link: {
      type: String,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ companyId: 1, userId: 1, isRead: 1 });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
