import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['PAID', 'UNPAID', 'VOID'],
      default: 'PAID',
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    pdfUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
