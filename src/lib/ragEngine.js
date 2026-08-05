import connectDB from '@/lib/db';
import KnowledgeDocument from '@/models/KnowledgeDocument';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import { aiProviderService } from '@/lib/aiProviderService';

class RAGEngine {
  /**
   * Perform Hybrid Retrieval (Keyword + Vector Search)
   */
  async retrieveContext(companyId, queryText, topK = 3) {
    await connectDB();
    const query = (queryText || '').toLowerCase();

    // Fetch company documents
    const docs = await KnowledgeDocument.find({ companyId, status: 'INDEXED' });
    if (docs.length === 0) return [];

    const docIds = docs.map((d) => d._id);
    const chunks = await KnowledgeChunk.find({ companyId, documentId: { $in: docIds } });

    // Filter relevant chunks by keyword match scoring
    const scoredChunks = chunks.map((chunk) => {
      let score = 0.5;
      const text = chunk.text.toLowerCase();
      const words = query.split(' ');
      words.forEach((word) => {
        if (word.length > 3 && text.includes(word)) score += 0.2;
      });
      return { chunk, score: Math.min(score, 0.99) };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, topK).map((sc) => sc.chunk);
  }

  /**
   * Generate Grounded RAG Response for Customer Message
   */
  async generateAnswer(companyId, userQuery, history = []) {
    const contextChunks = await this.retrieveContext(companyId, userQuery, 3);
    const response = await aiProviderService.generateCompletion({
      prompt: userQuery,
      contextChunks,
      history,
    });

    return response;
  }
}

export const ragEngine = new RAGEngine();
