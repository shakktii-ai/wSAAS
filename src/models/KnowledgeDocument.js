import mongoose from 'mongoose';

const KnowledgeDocumentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'General Knowledge',
      trim: true,
    },
    docType: {
      type: String,
      enum: ['PDF', 'DOCX', 'TXT', 'CSV', 'URL', 'FAQ', 'SOP'],
      default: 'TXT',
    },
    content: {
      type: String,
      required: true,
    },
    folder: {
      type: String,
      default: 'Root',
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['PROCESSING', 'INDEXED', 'FAILED'],
      default: 'INDEXED',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

KnowledgeDocumentSchema.index({ companyId: 1, title: 1 });

export default mongoose.models.KnowledgeDocument || mongoose.model('KnowledgeDocument', KnowledgeDocumentSchema);
