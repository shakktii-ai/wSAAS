import connectDB from '@/lib/db';
import KnowledgeBase from '@/models/KnowledgeBase';
import PromptManager from '@/models/PromptManager';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const getKnowledgeBase = async (req, res) => {
  try {
    await connectDB();
    const articles = await KnowledgeBase.find({ companyId: req.company._id }).sort({ createdAt: -1 });
    return successResponse(res, articles);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch knowledge base articles', 500);
  }
};

export const createKnowledgeArticle = async (req, res) => {
  try {
    await connectDB();
    const { title, category, content, tags } = req.body;
    const companyId = req.company._id;

    if (!title || !content) {
      return errorResponse(res, 'Article title and content are required', 400);
    }

    const article = await KnowledgeBase.create({
      companyId,
      title,
      category: category || 'General',
      content,
      tags: tags || [],
    });

    return successResponse(res, article, 'Knowledge base article added', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to add article', 500);
  }
};

export const getPrompts = async (req, res) => {
  try {
    await connectDB();
    const prompts = await PromptManager.find({ companyId: req.company._id }).sort({ createdAt: -1 });
    return successResponse(res, prompts);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch system prompts', 500);
  }
};

export const createPrompt = async (req, res) => {
  try {
    await connectDB();
    const { name, systemPrompt, temperature } = req.body;
    const companyId = req.company._id;

    if (!name || !systemPrompt) {
      return errorResponse(res, 'Prompt name and system prompt are required', 400);
    }

    const prompt = await PromptManager.create({
      companyId,
      name,
      systemPrompt,
      temperature: temperature || 0.7,
    });

    return successResponse(res, prompt, 'System prompt saved', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to save prompt', 500);
  }
};

export const generateAISuggestion = async (req, res) => {
  try {
    await connectDB();
    const { conversationId, userQuery } = req.body;
    const companyId = req.company._id;

    // Fetch Knowledge Base Articles for Context
    const kbArticles = await KnowledgeBase.find({ companyId, isActive: true });
    const kbContext = kbArticles.map((a) => `[${a.title}]: ${a.content}`).join('\n\n');

    // Fetch System Prompt
    const promptDoc = await PromptManager.findOne({ companyId, isDefault: true });
    const systemPrompt = promptDoc?.systemPrompt || 'You are an expert enterprise customer support AI assistant for SyncChat.';

    // Generate Contextual Response
    let aiResponse = '';
    const query = userQuery?.toLowerCase() || '';

    if (query.includes('price') || query.includes('pricing') || query.includes('plan')) {
      aiResponse = 'Our SyncChat Enterprise plan starts at $49/month with unlimited Meta WhatsApp Cloud API messages, visual bot builder, and multi-agent shared inbox.';
    } else if (query.includes('webhook') || query.includes('connect') || query.includes('meta')) {
      aiResponse = 'To connect your WhatsApp Business Account, navigate to Workspace Settings > Meta WhatsApp Cloud API and enter your Phone Number ID and Permanent Access Token.';
    } else if (kbArticles.length > 0) {
      aiResponse = `Based on our company knowledge base:\n"${kbArticles[0].content.slice(0, 150)}..."\n\nPlease let us know if you need further details!`;
    } else {
      aiResponse = 'Thank you for reaching out to SyncChat Support! An agent will assist you shortly, or feel free to ask any questions about our enterprise features.';
    }

    return successResponse(res, {
      suggestion: aiResponse,
      systemPrompt,
      kbArticlesCount: kbArticles.length,
    });
  } catch (error) {
    console.error('Generate AI Error:', error);
    return errorResponse(res, 'Failed to generate AI reply', 500);
  }
};

export const generateSummary = async (req, res) => {
  try {
    await connectDB();
    const { conversationId } = req.body;

    const conversation = await Conversation.findOne({ _id: conversationId, companyId: req.company._id });
    if (!conversation) {
      return errorResponse(res, 'Conversation not found', 404);
    }

    const messages = await Message.find({ conversationId, companyId: req.company._id }).sort({ createdAt: 1 });

    const msgCount = messages.length;
    const lastMsg = messages[messages.length - 1]?.body || 'None';

    const summary = `Customer ${conversation.customerName} (${conversation.customerPhone}) engaged in a thread containing ${msgCount} messages. Latest topic: "${lastMsg}". Thread status is currently ${conversation.status.toUpperCase()}.`;

    return successResponse(res, { summary });
  } catch (error) {
    return errorResponse(res, 'Failed to generate conversation summary', 500);
  }
};
