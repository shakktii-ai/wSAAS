import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import api from '@/services/api';
import {
  Sparkles,
  BookOpen,
  Settings,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  Bot,
  BrainCircuit,
  FileText,
  Sliders,
  TrendingUp,
  Clock,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function EnterpriseAIStudio() {
  const [activeTab, setActiveTab] = useState('knowledge'); // 'knowledge' | 'prompts' | 'playground' | 'analytics'
  const [articles, setArticles] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [analytics, setAnalytics] = useState({ totalDocuments: 0, totalChunks: 0, accuracyRate: 98.4, avgResponseTimeMs: 420 });
  const [loading, setLoading] = useState(true);

  // Playground State
  const [testQuery, setTestQuery] = useState('What are your pricing plans and refund policies?');
  const [aiResult, setAiResult] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Add Document Modal
  const [isArticleOpen, setIsArticleOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Pricing & Plans');
  const [docType, setDocType] = useState('TXT');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Prompt Form Modal
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptName, setPromptName] = useState('');
  const [promptType, setPromptType] = useState('support');
  const [promptText, setPromptText] = useState('');
  const [tone, setTone] = useState('Professional & Friendly');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [kbRes, promptRes, analyticsRes] = await Promise.all([
        api.get('/ai/knowledge'),
        api.get('/ai/prompts'),
        api.get('/ai/analytics'),
      ]);
      if (kbRes.success && kbRes.data) setArticles(kbRes.data);
      if (promptRes.success && promptRes.data) setPrompts(promptRes.data);
      if (analyticsRes.success && analyticsRes.data) setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTestAI = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setAiResult(null);

    try {
      const res = await api.post('/ai/generate', { userQuery: testQuery });
      if (res.success && res.data) {
        setAiResult(res.data);
      }
    } catch (err) {
      alert(err.message || 'AI completion failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddArticle = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/ai/knowledge', { title, category, docType, content });
      if (res.success) {
        setIsArticleOpen(false);
        setTitle('');
        setContent('');
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePrompt = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/ai/prompts', { name: promptName, type: promptType, promptText, tone });
      if (res.success) {
        setIsPromptOpen(false);
        setPromptName('');
        setPromptText('');
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteArticle = async (id) => {
    if (!confirm('Delete knowledge base document?')) return;
    try {
      const res = await api.delete(`/ai/knowledge/${id}`);
      if (res.success) fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <BrainCircuit className="w-6 h-6 text-purple-400" /> Enterprise AI Studio
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Isolated company AI intelligence layer, RAG knowledge vectors, multi-LLM provider abstraction, and brand voice prompts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Sliders} onClick={() => setIsPromptOpen(true)}>
              New Brand Prompt
            </Button>
            <Button icon={Plus} onClick={() => setIsArticleOpen(true)}>
              Add Document
            </Button>
          </div>
        </div>

        {/* AI Metrics Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Knowledge Docs</p>
              <h3 className="text-lg font-bold text-white">{analytics.totalDocuments}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Indexed Vector Chunks</p>
              <h3 className="text-lg font-bold text-white">{analytics.totalChunks}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">RAG Grounded Accuracy</p>
              <h3 className="text-lg font-bold text-white">{analytics.accuracyRate}%</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Avg Latency</p>
              <h3 className="text-lg font-bold text-white">{analytics.avgResponseTimeMs}ms</h3>
            </div>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`pb-3 transition-colors ${
              activeTab === 'knowledge' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            📚 Knowledge Base Documents ({articles.length})
          </button>

          <button
            onClick={() => setActiveTab('prompts')}
            className={`pb-3 transition-colors ${
              activeTab === 'prompts' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            🎯 Brand Voice Prompts ({prompts.length})
          </button>

          <button
            onClick={() => setActiveTab('playground')}
            className={`pb-3 transition-colors ${
              activeTab === 'playground' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ RAG Playground & Tester
          </button>
        </div>

        {/* Tab Content: Knowledge Base */}
        {activeTab === 'knowledge' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((art) => (
              <Card key={art._id} className="flex flex-col justify-between hover:border-slate-700 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      {art.docType || 'TXT'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {art.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm mb-1">{art.title}</h4>
                  <p className="text-xs text-slate-400 mb-2">{art.category}</p>
                  <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800 font-mono line-clamp-4">
                    {art.content}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800 text-[11px] text-slate-500">
                  <span>{art.chunkCount || 1} Vector Chunks</span>
                  <button onClick={() => handleDeleteArticle(art._id)} className="text-slate-500 hover:text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Tab Content: Prompts */}
        {activeTab === 'prompts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prompts.map((p) => (
              <Card key={p._id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">{p.name}</h4>
                  <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {p.type}
                  </span>
                </div>
                <p className="text-xs text-slate-400">Tone: {p.tone}</p>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
                  {p.promptText}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Tab Content: RAG Playground */}
        {activeTab === 'playground' && (
          <Card title="Enterprise RAG Grounded Completion Playground">
            <form onSubmit={handleTestAI} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Simulated Customer Question / Inquiry
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white"
                  />
                  <Button type="submit" loading={generating} icon={Sparkles}>
                    Generate RAG Answer
                  </Button>
                </div>
              </div>

              {aiResult && (
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-400">
                    <span>Generated Grounded Response</span>
                    <span className="font-mono bg-purple-500/20 px-2 py-0.5 rounded">
                      Score: {Math.round((aiResult.confidence || 0.94) * 100)}% Confidence
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-mono whitespace-pre-wrap">{aiResult.suggestion}</p>
                </div>
              )}
            </form>
          </Card>
        )}

        {/* Add Knowledge Article Modal */}
        <Modal isOpen={isArticleOpen} onClose={() => setIsArticleOpen(false)} title="Add Enterprise Knowledge Base Document">
          <form onSubmit={handleAddArticle} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Document Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enterprise Subscription FAQ"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Pricing, Technical, Returns"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Document Format</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="TXT">Text (TXT)</option>
                  <option value="PDF">PDF Document</option>
                  <option value="DOCX">Word DOCX</option>
                  <option value="FAQ">FAQ Page</option>
                  <option value="SOP">Standard Operating Procedure</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Document Body Context *</label>
              <textarea
                rows={5}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter detailed facts, SLAs, pricing parameters, or return policies..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsArticleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Index Knowledge Document
              </Button>
            </div>
          </form>
        </Modal>

        {/* Add Brand Voice Prompt Modal */}
        <Modal isOpen={isPromptOpen} onClose={() => setIsPromptOpen(false)} title="Configure Brand Voice Prompt">
          <form onSubmit={handleSavePrompt} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Prompt Name *</label>
              <input
                type="text"
                required
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                placeholder="Tier 1 Support Agent Prompt"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Prompt Department</label>
                <select
                  value={promptType}
                  onChange={(e) => setPromptType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="support">Customer Support</option>
                  <option value="sales">Sales & Leads</option>
                  <option value="billing">Billing & Invoices</option>
                  <option value="system">System Core</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Voice Tone</label>
                <input
                  type="text"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="Professional & Friendly"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Prompt Instructions *</label>
              <textarea
                rows={4}
                required
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="You are SyncChat AI Assistant. Always greet customers politely, answer using verified facts, and maintain a professional tone..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsPromptOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Save Prompt
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
