import mongoose from 'mongoose';

const KnowledgeChunkSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeDocument',
      required: true,
      index: true,
    },
    chunkIndex: {
      type: Number,
      default: 0,
    },
    text: {
      type: String,
      required: true,
    },
    embedding: [Number],
  },
  {
    timestamps: true,
  }
);

KnowledgeChunkSchema.index({ companyId: 1, documentId: 1, chunkIndex: 1 });

export default mongoose.models.KnowledgeChunk || mongoose.model('KnowledgeChunk', KnowledgeChunkSchema);
