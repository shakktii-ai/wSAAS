import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import api from '@/services/api';
import { FileText, RefreshCw, Plus, CheckCircle2, AlertCircle, Search, Filter } from 'lucide-react';

export default function WhatsAppTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState('');
  
  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('UTILITY');
  const [language, setLanguage] = useState('en_US');
  const [bodyText, setBodyText] = useState('Hello {{1}}, your order {{2}} has been confirmed!');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/whatsapp/templates');
      if (res.success && res.data) {
        setTemplates(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSyncMeta = async () => {
    setSyncing(true);
    setSyncSuccess('');
    try {
      const res = await api.post('/whatsapp/templates/sync');
      if (res.success) {
        setSyncSuccess(res.message);
        fetchTemplates();
      }
    } catch (err) {
      alert(err.message || 'Failed to sync templates');
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');

    try {
      const components = [
        {
          type: 'BODY',
          text: bodyText,
        },
      ];

      const res = await api.post('/whatsapp/templates', {
        name,
        category,
        language,
        components,
      });

      if (res.success) {
        setIsCreateOpen(false);
        setName('');
        setBodyText('');
        fetchTemplates();
      }
    } catch (err) {
      setModalError(err.message || 'Failed to create template');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      APPROVED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      PENDING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      REJECTED: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    };
    return (
      <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${badges[status] || badges.PENDING}`}>
        {status}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-emerald-400" /> WhatsApp Message Templates
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Create, view, and sync pre-approved Meta Cloud HSM templates.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" icon={RefreshCw} loading={syncing} onClick={handleSyncMeta}>
              Sync from Meta
            </Button>
            <Button icon={Plus} onClick={() => setIsCreateOpen(true)}>
              Create Template
            </Button>
          </div>
        </div>

        {syncSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {syncSuccess}
          </div>
        )}

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => {
            const bodyComp = tpl.components?.find((c) => c.type === 'BODY')?.text || '';
            return (
              <Card key={tpl._id} className="flex flex-col justify-between hover:border-slate-700 transition-colors">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-white text-sm truncate">{tpl.name}</h3>
                    {getStatusBadge(tpl.status)}
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-800 px-2 py-0.5 rounded">
                      {tpl.category}
                    </span>
                    <span className="text-[10px] text-slate-400">{tpl.language}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {bodyComp || '[Template Components]'}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Meta ID: {tpl.templateId || 'Local Draft'}</span>
                  <span>{new Date(tpl.syncedAt).toLocaleDateString()}</span>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Create Template Modal */}
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Meta WhatsApp Template">
          {modalError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {modalError}
            </div>
          )}

          <form onSubmit={handleCreateTemplate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Template Name (lowercase, underscores) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="order_confirmation_v1"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="UTILITY">UTILITY</option>
                  <option value="MARKETING">MARKETING</option>
                  <option value="AUTHENTICATION">AUTHENTICATION</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Language Code
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="en_US"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Body Text Content (Use &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125; for variables) *
              </label>
              <textarea
                rows={4}
                required
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Hello {{1}}, thank you for contacting us!"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Submit to Meta
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
