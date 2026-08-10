import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import api from '@/services/api';
import {
  FileText,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Copy,
  Trash2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Send,
  AlertTriangle,
  Clock,
  Ban,
  CheckCheck,
  Globe,
  Layers,
  HelpCircle,
} from 'lucide-react';

export default function TemplateManagerPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState('');

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedLanguage, setSelectedLanguage] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  // Wizard Modal State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [editingTemplateId, setEditingTemplateId] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('UTILITY');
  const [language, setLanguage] = useState('en_US');
  const [headerType, setHeaderType] = useState('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [bodyText, setBodyText] = useState('Hello {{1}}, your order {{2}} has been confirmed!');
  const [footerText, setFooterText] = useState('');
  const [buttons, setButtons] = useState([]);
  const [variables, setVariables] = useState([{ index: 1, sampleValue: 'John' }, { index: 2, sampleValue: 'ORD-992' }]);

  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Modals for Rejection, Preview & Delete Confirmation
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [rejectionTemplate, setRejectionTemplate] = useState(null);
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedLanguage !== 'ALL') params.append('language', selectedLanguage);
      if (sortBy) params.append('sort', sortBy);

      const res = await api.get(`/templates?${params.toString()}`);
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
  }, [search, selectedStatus, selectedCategory, selectedLanguage, sortBy]);

  // Handle Dynamic Variables Extraction
  useEffect(() => {
    const matches = Array.from(bodyText.matchAll(/\{\{(\d+)\}\}/g));
    if (matches && matches.length > 0) {
      const indices = Array.from(new Set(matches.map(m => parseInt(m[1], 10)))).sort((a, b) => a - b);
      setVariables(prev => {
        return indices.map(idx => {
          const existing = prev.find(v => Number(v.index) === idx);
          return existing || { index: idx, sampleValue: `Sample_${idx}` };
        });
      });
    } else {
      setVariables([]);
    }
  }, [bodyText]);

  const handleSyncMeta = async () => {
    setSyncing(true);
    setSyncSuccess('');
    try {
      const res = await api.post('/templates/sync');
      if (res.success) {
        setSyncSuccess(res.message);
        fetchTemplates();
        setTimeout(() => setSyncSuccess(''), 5000);
      }
    } catch (err) {
      alert(err.message || 'Failed to sync templates with Meta');
    } finally {
      setSyncing(false);
    }
  };

  const openCreateWizard = () => {
    setEditingTemplateId(null);
    setName('');
    setCategory('UTILITY');
    setLanguage('en_US');
    setHeaderType('NONE');
    setHeaderText('');
    setHeaderMediaUrl('');
    setBodyText('Hello {{1}}, thank you for choosing our service!');
    setFooterText('');
    setButtons([]);
    setVariables([{ index: 1, sampleValue: 'Alex' }]);
    setStep(1);
    setModalError('');
    setIsWizardOpen(true);
  };

  const handleDuplicate = (tpl) => {
    setEditingTemplateId(null);
    setName(`${tpl.name}_copy`);
    setCategory(tpl.category || 'UTILITY');
    setLanguage(tpl.language || 'en_US');
    setHeaderType(tpl.headerType || 'NONE');
    setHeaderText(tpl.headerText || '');
    setHeaderMediaUrl(tpl.headerMediaUrl || '');
    setBodyText(tpl.bodyText || '');
    setFooterText(tpl.footerText || '');
    setButtons(tpl.buttons || []);
    setVariables(tpl.variables || []);
    setStep(1);
    setModalError('');
    setIsWizardOpen(true);
  };

  const handleSaveOrSubmit = async (submitToMeta = false) => {
    setSubmitting(true);
    setModalError('');

    try {
      const payload = {
        name,
        category,
        language,
        headerType,
        headerText,
        headerMediaUrl,
        bodyText,
        footerText,
        buttons,
        variables,
        submit: submitToMeta,
      };

      let res;
      if (editingTemplateId) {
        res = await api.put(`/templates/${editingTemplateId}`, payload);
      } else {
        res = await api.post('/templates', payload);
      }

      if (res.success) {
        setIsWizardOpen(false);
        fetchTemplates();
      }
    } catch (err) {
      setModalError(err.message || 'Failed to process template action');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tpl) => {
    if (tpl.status === 'DRAFT') {
      try {
        const res = await api.delete(`/templates/${tpl._id}`);
        if (res.success) fetchTemplates();
      } catch (err) {
        alert(err.message || 'Failed to delete template');
      }
    } else {
      setDeleteConfirmTemplate(tpl);
    }
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirmTemplate) return;
    try {
      const res = await api.delete(`/templates/${deleteConfirmTemplate._id}?confirm=true`);
      if (res.success) {
        setDeleteConfirmTemplate(null);
        fetchTemplates();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete template');
    }
  };

  // Status Badge Renderer
  const renderStatusBadge = (status) => {
    const styles = {
      APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 icon-check',
      PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/30 icon-clock',
      REJECTED: 'bg-rose-500/10 text-rose-400 border-rose-500/30 icon-alert',
      PAUSED: 'bg-slate-800 text-slate-400 border-slate-700',
      DISABLED: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      DRAFT: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    };

    return (
      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase rounded-full border flex items-center gap-1 ${styles[status] || styles.DRAFT}`}>
        {status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
        {status === 'PENDING' && <Clock className="w-3 h-3" />}
        {status === 'REJECTED' && <AlertCircle className="w-3 h-3" />}
        {status}
      </span>
    );
  };

  // Category Badge Renderer
  const renderCategoryBadge = (cat) => {
    const styles = {
      MARKETING: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      UTILITY: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      AUTHENTICATION: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    };
    return (
      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${styles[cat] || styles.UTILITY}`}>
        {cat}
      </span>
    );
  };

  // Variable replacement preview function
  const renderPreviewBodyText = (text, vars) => {
    let result = text || '';
    if (vars && Array.isArray(vars)) {
      vars.forEach(v => {
        const regex = new RegExp(`\\{\\{${v.index}\\}\\}`, 'g');
        result = result.replace(regex, v.sampleValue || `{{${v.index}}}`);
      });
    }
    return result;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <FileText className="w-7 h-7 text-emerald-400" /> Enterprise WhatsApp Template Manager
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Create, review, sync, preview, and manage official Meta Cloud HSM WhatsApp templates directly from SyncChat.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" icon={RefreshCw} loading={syncing} onClick={handleSyncMeta}>
              Sync Templates
            </Button>
            <Button icon={Plus} onClick={openCreateWizard}>
              Create Template
            </Button>
          </div>
        </div>

        {syncSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5 shadow-lg shadow-emerald-500/5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncSuccess}</span>
          </div>
        )}

        {/* Main Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel Filters */}
          <div className="lg:col-span-1 space-y-5 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
            {/* Search Input */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Search Templates
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by name..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Status
              </label>
              <div className="space-y-1">
                {['ALL', 'APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED', 'DRAFT'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatus(st)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                      selectedStatus === st
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <span>{st === 'ALL' ? 'All Statuses' : st}</span>
                    {selectedStatus === st && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
              >
                <option value="ALL">All Categories</option>
                <option value="MARKETING">MARKETING</option>
                <option value="UTILITY">UTILITY</option>
                <option value="AUTHENTICATION">AUTHENTICATION</option>
              </select>
            </div>

            {/* Language Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
              >
                <option value="ALL">All Languages</option>
                <option value="en_US">English (en_US)</option>
                <option value="es_ES">Spanish (es_ES)</option>
                <option value="pt_BR">Portuguese (pt_BR)</option>
                <option value="fr_FR">French (fr_FR)</option>
                <option value="de_DE">German (de_DE)</option>
                <option value="hi_IN">Hindi (hi_IN)</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="alphabetical">Alphabetical (A-Z)</option>
                <option value="lastSynced">Recently Synced</option>
              </select>
            </div>
          </div>

          {/* Main Grid View */}
          <div className="lg:col-span-3 space-y-4">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                <span>Loading WhatsApp templates...</span>
              </div>
            ) : templates.length === 0 ? (
              <Card className="p-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-white">No WhatsApp templates found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Create a new template using the wizard or click "Sync Templates" to pull existing WABA templates from Meta Cloud API.
                </p>
                <Button icon={Plus} onClick={openCreateWizard} className="mx-auto">
                  Create First Template
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((tpl) => (
                  <Card key={tpl._id} className="flex flex-col justify-between hover:border-slate-700 transition-all border-slate-800/80">
                    <div>
                      {/* Top Meta Bar */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="overflow-hidden">
                          <h3 className="font-bold text-white text-sm truncate tracking-tight" title={tpl.name}>
                            {tpl.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {renderCategoryBadge(tpl.category)}
                            <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                              {tpl.language}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">v{tpl.version || 1}</span>
                          </div>
                        </div>
                        <div>{renderStatusBadge(tpl.status)}</div>
                      </div>

                      {/* Content Preview Box */}
                      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto scrollbar-thin">
                        {tpl.headerText && (
                          <div className="font-bold text-white mb-1.5 pb-1 border-b border-slate-800">
                            [{tpl.headerType}] {tpl.headerText}
                          </div>
                        )}
                        <div>{tpl.bodyText || '[Body Content]'}</div>
                        {tpl.footerText && (
                          <div className="text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-slate-800/60">
                            {tpl.footerText}
                          </div>
                        )}
                      </div>

                      {/* Buttons Chip Summary */}
                      {tpl.buttons && tpl.buttons.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {tpl.buttons.map((b, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-emerald-400 border border-slate-700 font-medium">
                              🔘 {b.text} ({b.type})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <div className="text-[10px] text-slate-500">
                        <span>Synced: {new Date(tpl.syncedAt || tpl.updatedAt).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {tpl.status === 'REJECTED' && (
                          <button
                            onClick={() => setRejectionTemplate(tpl)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-colors flex items-center gap-1"
                            title="View Rejection Reason"
                          >
                            <AlertCircle className="w-3.5 h-3.5" /> Fix
                          </button>
                        )}

                        <button
                          onClick={() => setPreviewTemplate(tpl)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                          title="WhatsApp Phone Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDuplicate(tpl)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                          title="Duplicate Template"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(tpl)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 7-STEP CREATE TEMPLATE WIZARD MODAL */}
        <Modal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          title="Meta WhatsApp Template Creator & Submit Wizard"
        >
          <div className="space-y-5">
            {/* Step Navigation Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
              {[
                { s: 1, name: 'Basic Info' },
                { s: 2, name: 'Header' },
                { s: 3, name: 'Body & Vars' },
                { s: 4, name: 'Footer' },
                { s: 5, name: 'Buttons' },
                { s: 6, name: 'Phone Preview' },
                { s: 7, name: 'Review & Action' },
              ].map((item) => (
                <button
                  key={item.s}
                  onClick={() => setStep(item.s)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                    step === item.s
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : step > item.s
                      ? 'bg-slate-800 text-emerald-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {item.s}. {item.name}
                </button>
              ))}
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {modalError}
              </div>
            )}

            {/* STEP 1: BASIC INFO */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Template Name (lowercase, numbers & underscores only) *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    placeholder="e.g. order_shipping_update_v1"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Must be unique per language in your Meta Business Account.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                    >
                      <option value="UTILITY">UTILITY (Transactional, Account Updates)</option>
                      <option value="MARKETING">MARKETING (Promotions, Discounts, News)</option>
                      <option value="AUTHENTICATION">AUTHENTICATION (OTP & Passcodes)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Language Code *
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                    >
                      <option value="en_US">English (en_US)</option>
                      <option value="es_ES">Spanish (es_ES)</option>
                      <option value="pt_BR">Portuguese (pt_BR)</option>
                      <option value="fr_FR">French (fr_FR)</option>
                      <option value="de_DE">German (de_DE)</option>
                      <option value="hi_IN">Hindi (hi_IN)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: HEADER */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Header Type
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setHeaderType(type)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors ${
                          headerType === type
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {headerType === 'TEXT' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Header Text
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      placeholder="Order Confirmed! (Max 60 characters)"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                    />
                  </div>
                )}

                {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Sample Media URL (Required by Meta for template review)
                    </label>
                    <input
                      type="url"
                      value={headerMediaUrl}
                      onChange={(e) => setHeaderMediaUrl(e.target.value)}
                      placeholder="https://example.com/sample_image.jpg"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                    />
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: BODY & VARIABLES */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Body Text *
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setBodyText(prev => prev + ' {{1}}')}
                        className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-emerald-400 hover:bg-slate-700"
                      >
                        + &#123;&#123;1&#125;&#125;
                      </button>
                      <button
                        type="button"
                        onClick={() => setBodyText(prev => prev + ' {{2}}')}
                        className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-emerald-400 hover:bg-slate-700"
                      >
                        + &#123;&#123;2&#125;&#125;
                      </button>
                      <button
                        type="button"
                        onClick={() => setBodyText(prev => prev + ' {{3}}')}
                        className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-emerald-400 hover:bg-slate-700"
                      >
                        + &#123;&#123;3&#125;&#125;
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    required
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    placeholder="Hello {{1}}, your parcel #{{2}} is out for delivery."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                  />
                </div>

                {/* Variable Sample Inputs */}
                {variables.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <p className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" /> Mandatory Variable Examples (Meta Compliance)
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {variables.map((v, i) => (
                        <div key={v.index}>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Variable &#123;&#123;{v.index}&#125;&#125; Sample Value
                          </label>
                          <input
                            type="text"
                            required
                            value={v.sampleValue}
                            onChange={(e) => {
                              const val = e.target.value;
                              setVariables(prev =>
                                prev.map(item => (item.index === v.index ? { ...item, sampleValue: val } : item))
                              );
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: FOOTER */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Footer Text (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="e.g. Reply STOP to opt-out. (Max 60 chars)"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
              </div>
            )}

            {/* STEP 5: BUTTONS */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Interactive Buttons (Max 3 Quick Replies or CTAs)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setButtons(prev => [...prev, { type: 'QUICK_REPLY', text: 'Confirm' }])}
                      className="px-2.5 py-1 rounded bg-slate-800 text-[10px] font-bold text-emerald-400 hover:bg-slate-700"
                    >
                      + Quick Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => setButtons(prev => [...prev, { type: 'URL', text: 'Visit Website', url: 'https://example.com' }])}
                      className="px-2.5 py-1 rounded bg-slate-800 text-[10px] font-bold text-teal-400 hover:bg-slate-700"
                    >
                      + URL CTA
                    </button>
                    <button
                      type="button"
                      onClick={() => setButtons(prev => [...prev, { type: 'PHONE_NUMBER', text: 'Call Support', phoneNumber: '+1234567890' }])}
                      className="px-2.5 py-1 rounded bg-slate-800 text-[10px] font-bold text-blue-400 hover:bg-slate-700"
                    >
                      + Phone CTA
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {buttons.map((btn, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <select
                          value={btn.type}
                          onChange={(e) => {
                            const newType = e.target.value;
                            setButtons(prev => prev.map((b, i) => i === idx ? { ...b, type: newType } : b));
                          }}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                        >
                          <option value="QUICK_REPLY">Quick Reply</option>
                          <option value="URL">CTA URL</option>
                          <option value="PHONE_NUMBER">CTA Phone</option>
                          <option value="COPY_CODE">Copy Code</option>
                        </select>

                        <input
                          type="text"
                          value={btn.text}
                          onChange={(e) => {
                            const val = e.target.value;
                            setButtons(prev => prev.map((b, i) => i === idx ? { ...b, text: val } : b));
                          }}
                          placeholder="Button Label"
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                        />

                        {btn.type === 'URL' && (
                          <input
                            type="text"
                            value={btn.url || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setButtons(prev => prev.map((b, i) => i === idx ? { ...b, url: val } : b));
                            }}
                            placeholder="https://..."
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                          />
                        )}

                        {btn.type === 'PHONE_NUMBER' && (
                          <input
                            type="text"
                            value={btn.phoneNumber || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setButtons(prev => prev.map((b, i) => i === idx ? { ...b, phoneNumber: val } : b));
                            }}
                            placeholder="+1234567890"
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                          />
                        )}

                        {btn.type === 'COPY_CODE' && (
                          <input
                            type="text"
                            value={btn.code || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setButtons(prev => prev.map((b, i) => i === idx ? { ...b, code: val } : b));
                            }}
                            placeholder="DISCOUNT50"
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setButtons(prev => prev.filter((_, i) => i !== idx))}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 6: PHONE PREVIEW (WhatsApp Mobile Container) */}
            {step === 6 && (
              <div className="flex justify-center py-2">
                <div className="w-72 bg-slate-950 rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden font-sans">
                  {/* Phone Header Bar */}
                  <div className="bg-slate-900 px-4 py-2.5 flex items-center gap-2 border-b border-slate-800">
                    <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-xs">
                      S
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">SyncChat Business</p>
                      <p className="text-[9px] text-emerald-400">Verified WhatsApp Business</p>
                    </div>
                  </div>

                  {/* Chat Area Wallpaper */}
                  <div className="p-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px] bg-slate-950 min-h-[220px]">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3 shadow-md space-y-2">
                      {headerType !== 'NONE' && (
                        <div className="font-bold text-xs text-white pb-1 border-b border-slate-800">
                          {headerType === 'TEXT' ? headerText || '[Header Text]' : `[Header ${headerType}]`}
                        </div>
                      )}

                      <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {renderPreviewBodyText(bodyText, variables)}
                      </div>

                      {footerText && (
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                          {footerText}
                        </div>
                      )}

                      <div className="flex justify-end items-center gap-1 text-[9px] text-slate-500 pt-1">
                        <span>10:42 AM</span>
                        <CheckCheck className="w-3 h-3 text-emerald-400" />
                      </div>
                    </div>

                    {/* Interactive Action Buttons */}
                    {buttons.map((btn, i) => (
                      <div key={i} className="mt-1.5 text-center bg-slate-900 border border-slate-800 rounded-xl py-1.5 text-xs text-emerald-400 font-semibold shadow-sm">
                        {btn.type === 'URL' && '🔗 '}
                        {btn.type === 'PHONE_NUMBER' && '📞 '}
                        {btn.type === 'COPY_CODE' && '📋 '}
                        {btn.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 7: REVIEW & ACTION */}
            {step === 7 && (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Template Ready for Action</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    You can either save this template locally as a Draft to work on later, or submit it directly to Meta Cloud API for review.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left text-xs space-y-1.5">
                  <p className="text-slate-300"><strong>Name:</strong> <span className="font-mono text-emerald-400">{name}</span></p>
                  <p className="text-slate-300"><strong>Category:</strong> {category}</p>
                  <p className="text-slate-300"><strong>Language:</strong> {language}</p>
                  <p className="text-slate-300"><strong>Header:</strong> {headerType}</p>
                  <p className="text-slate-300"><strong>Variables:</strong> {variables.length} configured with sample values</p>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="secondary"
                disabled={step === 1}
                onClick={() => setStep(prev => Math.max(1, prev - 1))}
              >
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {step < 7 ? (
                  <Button type="button" onClick={() => setStep(prev => Math.min(7, prev + 1))}>
                    Next Step
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      loading={submitting}
                      onClick={() => handleSaveOrSubmit(false)}
                    >
                      Save Draft
                    </Button>
                    <Button
                      type="button"
                      loading={submitting}
                      onClick={() => handleSaveOrSubmit(true)}
                    >
                      Submit to Meta
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Modal>

        {/* PREVIEW MODAL */}
        <Modal
          isOpen={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          title={`WhatsApp Phone Preview: ${previewTemplate?.name}`}
        >
          {previewTemplate && (
            <div className="flex justify-center py-2">
              <div className="w-72 bg-slate-950 rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden font-sans">
                <div className="bg-slate-900 px-4 py-2.5 flex items-center gap-2 border-b border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-xs">
                    S
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">SyncChat Business</p>
                    <p className="text-[9px] text-emerald-400">Verified WhatsApp Business</p>
                  </div>
                </div>

                <div className="p-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px] bg-slate-950 min-h-[220px]">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3 shadow-md space-y-2">
                    {previewTemplate.headerText && (
                      <div className="font-bold text-xs text-white pb-1 border-b border-slate-800">
                        [{previewTemplate.headerType}] {previewTemplate.headerText}
                      </div>
                    )}

                    <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {renderPreviewBodyText(previewTemplate.bodyText, previewTemplate.variables)}
                    </div>

                    {previewTemplate.footerText && (
                      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                        {previewTemplate.footerText}
                      </div>
                    )}

                    <div className="flex justify-end items-center gap-1 text-[9px] text-slate-500 pt-1">
                      <span>10:42 AM</span>
                      <CheckCheck className="w-3 h-3 text-emerald-400" />
                    </div>
                  </div>

                  {previewTemplate.buttons?.map((btn, i) => (
                    <div key={i} className="mt-1.5 text-center bg-slate-900 border border-slate-800 rounded-xl py-1.5 text-xs text-emerald-400 font-semibold shadow-sm">
                      {btn.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* REJECTION DETAILS MODAL */}
        <Modal
          isOpen={!!rejectionTemplate}
          onClose={() => setRejectionTemplate(null)}
          title="Meta Template Rejection Details"
        >
          {rejectionTemplate && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" /> Reason for Rejection
                </div>
                <p className="text-xs leading-relaxed">
                  {rejectionTemplate.rejection?.reason || 'Template failed Meta content review policy.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <p className="text-slate-300"><strong>Category:</strong> {rejectionTemplate.rejection?.category || rejectionTemplate.category}</p>
                <p className="text-slate-300"><strong>Suggested Fix:</strong> {rejectionTemplate.rejection?.suggestedFix || 'Review content for formatting or policy issues.'}</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setRejectionTemplate(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    const t = rejectionTemplate;
                    setRejectionTemplate(null);
                    handleDuplicate(t);
                  }}
                >
                  Duplicate & Edit
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* DELETE CONFIRMATION MODAL */}
        <Modal
          isOpen={!!deleteConfirmTemplate}
          onClose={() => setDeleteConfirmTemplate(null)}
          title="Confirm Template Deletion"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              Are you sure you want to delete template <strong className="text-white">{deleteConfirmTemplate?.name}</strong>?
            </p>
            <p className="text-[11px] text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
              ⚠️ Warning: This template is in '{deleteConfirmTemplate?.status}' status. Deleting it will remove it from your workspace and request deletion from Meta Business Manager.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setDeleteConfirmTemplate(null)}>
                Cancel
              </Button>
              <Button onClick={confirmDeleteAction} className="bg-rose-600 hover:bg-rose-500 text-white">
                Delete Template
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
