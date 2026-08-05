import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import api from '@/services/api';
import { Sparkles, BookOpen, Settings, Send, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export default function AIStudio() {
  const [articles, setArticles] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Playground State
  const [testQuery, setTestQuery] = useState('What are your pricing plans?');
  const [aiOutput, setAiOutput] = useState('');
  const [generating, setGenerating] = useState(false);

  // Add Article Modal
  const [isArticleOpen, setIsArticleOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Pricing & Plans');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [kbRes, promptRes] = await Promise.all([
        api.get('/ai/knowledge'),
        api.get('/ai/prompts'),
      ]);
      if (kbRes.success) setArticles(kbRes.data);
      if (promptRes.success) setPrompts(promptRes.data);
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
    setAiOutput('');

    try {
      const res = await api.post('/ai/generate', { userQuery: testQuery });
      if (res.success && res.data) {
        setAiOutput(res.data.suggestion);
      }
    } catch (err) {
      alert(err.message || 'AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddArticle = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/ai/knowledge', { title, category, content });
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

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-400" /> AI Assistant Studio & Knowledge Base
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage company knowledge base documents, custom system prompts, and AI auto-reply suggestions.
            </p>
          </div>
          <Button icon={Plus} onClick={() => setIsArticleOpen(true)}>
            Add Knowledge Base Doc
          </Button>
        </div>

        {/* AI Playground Card */}
        <Card title="AI Response Playground" subtitle="Test customer query against active Knowledge Base context">
          <form onSubmit={handleTestAI} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Simulated Customer Message
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="Ask a customer support question..."
                  className="flex-1 bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500/60"
                />
                <Button type="submit" loading={generating} icon={Sparkles}>
                  Generate AI Reply
                </Button>
              </div>
            </div>

            {aiOutput && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1">
                <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">Generated AI Response</p>
                <p className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">{aiOutput}</p>
              </div>
            )}
          </form>
        </Card>

        {/* Knowledge Base Articles Grid */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" /> Company Knowledge Base Documents ({articles.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.map((art) => (
              <Card key={art._id} className="hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white text-sm">{art.title}</h4>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-purple-400">
                    {art.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 font-mono">
                  {art.content}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Add Knowledge Article Modal */}
        <Modal isOpen={isArticleOpen} onClose={() => setIsArticleOpen(false)} title="Add Knowledge Base Document">
          <form onSubmit={handleAddArticle} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Document Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enterprise Subscription FAQ"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Pricing, Technical, Returns"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Document Body / Knowledge Context *
              </label>
              <textarea
                rows={5}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter detailed facts, FAQs, return policies, or system credentials..."
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsArticleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Save Document
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
