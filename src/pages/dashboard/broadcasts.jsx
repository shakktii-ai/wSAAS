import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import api from '@/services/api';
import {
  Send,
  Plus,
  Play,
  Pause,
  Copy,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  Users,
  CheckCheck,
  TrendingUp,
  Activity,
  Layers,
  XCircle,
  MousePointerClick,
  CalendarDays,
  Zap,
  Ban,
  RotateCcw,
} from 'lucide-react';

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  COMPLETED: {
    label: 'Completed',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
  PROCESSING: {
    label: 'Processing',
    className: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
    icon: Activity,
  },
  SCHEDULED: {
    label: 'Scheduled',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Clock,
  },
  PAUSED: {
    label: 'Paused',
    className: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: Pause,
  },
  DRAFT: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Layers,
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertCircle,
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-slate-200 text-slate-500 border-slate-300',
    icon: Ban,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatScheduledAt(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** Minimum datetime-local value = now + 2 minutes */
function minDatetimeLocal() {
  const d = new Date(Date.now() + 2 * 60 * 1000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

function getTemplateBodyText(template) {
  if (!template) return '';
  if (template.bodyText && template.bodyText.trim()) return template.bodyText;
  if (Array.isArray(template.components)) {
    const bodyComp = template.components.find(c => (c.type || '').toUpperCase() === 'BODY');
    if (bodyComp?.text) return bodyComp.text;
  }
  return '';
}

const PRESET_VARIABLE_MAPPINGS = [
  {
    group: 'Contact Built-in Fields',
    items: [
      { label: '👤 Contact Full Name', value: '{{name}}' },
      { label: '📱 Phone Number', value: '{{phone}}' },
      { label: '✉️ Email Address', value: '{{email}}' },
      { label: '🏢 Company Name', value: '{{company}}' },
      { label: '💼 Designation / Role', value: '{{designation}}' },
      { label: '🏙️ City', value: '{{city}}' },
      { label: '📍 State', value: '{{state}}' },
      { label: '🌐 Country', value: '{{country}}' },
      { label: '⭐ Lead Score', value: '{{leadScore}}' },
    ],
  },
  {
    group: 'Workflow & Service Request Fields',
    items: [
      { label: '🎫 Service Request ID (serviceRequestId)', value: '{{custom.serviceRequestId}}' },
      { label: '🔧 Technician / Vendor Name (technicianName)', value: '{{custom.technicianName}}' },
      { label: '📅 Service Date / Time (serviceDate)', value: '{{custom.serviceDate}}' },
      { label: '📊 Ticket Status (status)', value: '{{custom.status}}' },
      { label: '🛠️ Service Category / Type (category)', value: '{{custom.category}}' },
      { label: '📮 Pin Code (pincode)', value: '{{custom.pincode}}' },
      { label: '🏠 Address (address)', value: '{{custom.address}}' },
      { label: '📝 Details / Description (details)', value: '{{custom.details}}' },
    ],
  },
  {
    group: 'Custom Mapping & Fixed Values',
    items: [
      { label: '⚙️ Other Custom Field...', value: '__CUSTOM__' },
      { label: '📌 Static Value (Fixed for all recipients)...', value: '__STATIC__' },
    ],
  },
];

function detectParamLabelFromBody(bodyText, idx, fallbackLabel) {
  if (!bodyText) return fallbackLabel || `Param ${idx}`;
  const regex = new RegExp(`(?:\\d+\\.\\s*)?([^\\n{}:]+)[:\\s=]*\\{\\{${idx}\\}\\}`, 'i');
  const match = bodyText.match(regex);
  if (match && match[1]) {
    const extracted = match[1].trim().replace(/^[\d.\s\-\*]+/, '').trim();
    if (extracted && extracted.length > 1) {
      return extracted;
    }
  }
  return fallbackLabel || `Param ${idx}`;
}

/**
 * Parse a template to extract parameter placeholders {{1}}, {{2}}, etc.
 */
function parseTemplateVariables(template) {
  if (!template) return [];

  const bodyText = getTemplateBodyText(template);
  const matches = Array.from(bodyText.matchAll(/\{\{(\d+)\}\}/g));

  if (!matches || matches.length === 0) {
    return [];
  }

  // Unique parameter indices in numerical order (1, 2, 3...)
  const indices = Array.from(new Set(matches.map(m => parseInt(m[1], 10)))).sort((a, b) => a - b);

  const allPresetValues = PRESET_VARIABLE_MAPPINGS.flatMap(g => g.items.map(i => i.value));

  return indices.map(idx => {
    let sample = `Param ${idx}`;
    if (Array.isArray(template.variables)) {
      const found = template.variables.find(v => (typeof v === 'object' && (v.index === idx || Number(v.index) === idx)));
      if (found?.sampleValue || found?.paramName) {
        sample = found.sampleValue || found.paramName;
      }
    }

    const detectedLabel = detectParamLabelFromBody(bodyText, idx, sample);
    const labelToMatch = (detectedLabel !== `Param ${idx}` ? detectedLabel : sample).toLowerCase();

    let defaultMapping = '{{name}}';
    if (labelToMatch.includes('ticket') || labelToMatch.includes('request') || labelToMatch.includes('id')) {
      defaultMapping = '{{custom.serviceRequestId}}';
    } else if (labelToMatch.includes('tech') || labelToMatch.includes('vendor') || labelToMatch.includes('assign')) {
      defaultMapping = '{{custom.technicianName}}';
    } else if (labelToMatch.includes('date') || labelToMatch.includes('time')) {
      defaultMapping = '{{custom.serviceDate}}';
    } else if (labelToMatch.includes('status')) {
      defaultMapping = '{{custom.status}}';
    } else if (labelToMatch.includes('cat') || labelToMatch.includes('type')) {
      defaultMapping = '{{custom.category}}';
    } else if (labelToMatch.includes('code') || labelToMatch.includes('pin')) {
      defaultMapping = '{{custom.pincode}}';
    } else if (labelToMatch.includes('addr')) {
      defaultMapping = '{{custom.address}}';
    } else if (labelToMatch.includes('detail') || labelToMatch.includes('desc')) {
      defaultMapping = '{{custom.details}}';
    } else if (idx === 1) {
      defaultMapping = '{{name}}';
    }

    const isPreset = allPresetValues.includes(defaultMapping);

    return {
      index: idx,
      label: detectedLabel,
      mappingType: isPreset ? defaultMapping : '__CUSTOM__',
      customKey: !isPreset && defaultMapping.startsWith('{{custom.') ? defaultMapping.slice(9, -2) : '',
      staticValue: '',
      value: defaultMapping,
    };
  });
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, color = 'slate' }) {
  const colors = {
    slate:  'bg-slate-950 border-slate-800 text-slate-300',
    emerald:'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    sky:    'bg-sky-500/10 border-sky-500/20 text-sky-400',
    rose:   'bg-rose-500/10 border-rose-500/20 text-rose-400',
    amber:  'bg-amber-500/10 border-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    teal:   'bg-teal-500/10 border-teal-500/20 text-teal-400',
  };
  return (
    <div className={`p-3 rounded-xl border text-center ${colors[color]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BroadcastsManager() {
  const [broadcasts, setBroadcasts]     = useState([]);
  const [summary, setSummary]           = useState({ totalCampaigns: 0, completedCount: 0, scheduledCount: 0, totalSent: 0 });
  const [templates, setTemplates]       = useState([]);
  const [loading, setLoading]           = useState(true);

  // ── Create Campaign Modal ────────────────────────────────────────────────
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName]                 = useState('');
  const [description, setDescription]  = useState('');
  const [campaignType, setCampaignType] = useState('PROMOTIONAL');
  const [templateName, setTemplateName] = useState('');
  /** Full template object for the currently selected template */
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  /**
   * templateVariables: array of { index: Number, label: String, value: String }
   * Built automatically when templateName changes by parsing bodyText for {{N}} placeholders.
   */
  const [templateVariables, setTemplateVariables] = useState([]);
  const [targetType, setTargetType]     = useState('all');
  const [targetValue, setTargetValue]   = useState('');

  /** 'now' | 'later' */
  const [sendMode, setSendMode]         = useState('now');
  const [scheduledAt, setScheduledAt]   = useState('');

  const [submitting, setSubmitting]     = useState(false);
  const [createError, setCreateError]   = useState('');

  // ── Analytics Modal ──────────────────────────────────────────────────────
  const [selectedReport, setSelectedReport] = useState(null);

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchBroadcasts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/broadcasts');
      if (res.success && res.data) {
        const list = res.data.broadcasts || res.data;
        setBroadcasts(Array.isArray(list) ? list : []);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get('/templates?status=APPROVED');
      if (res.success && res.data) {
        const approvedOnly = res.data.filter((t) => t.status === 'APPROVED');
        setTemplates(approvedOnly);
        if (approvedOnly.length > 0) {
          const first = approvedOnly[0];
          setTemplateName(first.name);
          setSelectedTemplate(first);
          setTemplateVariables(parseTemplateVariables(first));
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchBroadcasts();
    fetchTemplates();
  }, [fetchBroadcasts, fetchTemplates]);

  // ── Create ───────────────────────────────────────────────────────────────

  const resetCreateForm = () => {
    setName('');
    setDescription('');
    setCampaignType('PROMOTIONAL');
    const first = templates[0] || null;
    setTemplateName(first?.name || '');
    setSelectedTemplate(first);
    setTemplateVariables(first ? parseTemplateVariables(first) : []);
    setTargetType('all');
    setTargetValue('');
    setSendMode('now');
    setScheduledAt('');
    setCreateError('');
  };

  const handleCreateBroadcast = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setCreateError('');

    // Client-side validation for Schedule Later
    if (sendMode === 'later') {
      if (!scheduledAt) {
        setCreateError('Please select a scheduled date and time.');
        setSubmitting(false);
        return;
      }
      if (new Date(scheduledAt) <= new Date()) {
        setCreateError('Scheduled time must be in the future. Pick a date/time at least 1 minute ahead.');
        setSubmitting(false);
        return;
      }
    }

    try {
      // Validate all required template variables are filled
      const missingVars = templateVariables.filter((v) => !v.value.trim());
      if (missingVars.length > 0) {
        setCreateError(`Please fill in all template parameters: ${missingVars.map(v => `{{${v.index}}}`).join(', ')}`);
        setSubmitting(false);
        return;
      }

      const payload = {
        name,
        description,
        campaignType,
        templateName,
        targetType,
        targetValue,
        // variables: ordered array of values for {{1}}, {{2}}, etc.
        variables: templateVariables.map((v) => v.value),
        // For 'now': sendNow flag tells server to keep as DRAFT so we execute immediately
        sendNow: sendMode === 'now',
        scheduledAt: sendMode === 'later' ? scheduledAt : undefined,
      };

      const createRes = await api.post('/broadcasts', payload);
      if (!createRes.success) {
        setCreateError(createRes.message || 'Failed to create campaign');
        return;
      }

      const newBroadcast = createRes.data;

      if (sendMode === 'now') {
        // Immediately dispatch the newly created campaign
        try {
          const execRes = await api.post(`/broadcasts/${newBroadcast._id}/execute`);
          if (execRes.success) {
            setIsCreateOpen(false);
            resetCreateForm();
            fetchBroadcasts();
          } else {
            setCreateError(execRes.message || 'Campaign created but dispatch failed.');
            fetchBroadcasts(); // Still refresh so user sees the DRAFT
          }
        } catch (execErr) {
          setCreateError(execErr.message || 'Campaign created but dispatch failed.');
          fetchBroadcasts();
        }
      } else {
        // Schedule Later — campaign is SCHEDULED, cron will pick it up
        setIsCreateOpen(false);
        resetCreateForm();
        fetchBroadcasts();
      }
    } catch (err) {
      setCreateError(err.message || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleExecuteBroadcast = async (id) => {
    if (!confirm('Dispatch broadcast campaign to target WhatsApp contacts now?')) return;
    try {
      const res = await api.post(`/broadcasts/${id}/execute`);
      if (res.success) {
        alert(res.message);
        fetchBroadcasts();
      }
    } catch (err) {
      alert(err.message || 'Broadcast execution failed');
    }
  };

  const handleCancelBroadcast = async (id, name) => {
    if (!confirm(`Cancel scheduled campaign "${name}"? This cannot be undone.`)) return;
    try {
      const res = await api.post(`/broadcasts/${id}/cancel`);
      if (res.success) fetchBroadcasts();
    } catch (err) {
      alert(err.message || 'Failed to cancel campaign');
    }
  };

  const handlePauseBroadcast = async (id) => {
    try {
      const res = await api.post(`/broadcasts/${id}/pause`);
      if (res.success) fetchBroadcasts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResumeBroadcast = async (id) => {
    try {
      const res = await api.post(`/broadcasts/${id}/resume`);
      if (res.success) fetchBroadcasts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCloneBroadcast = async (id) => {
    try {
      const res = await api.post(`/broadcasts/${id}/clone`);
      if (res.success) fetchBroadcasts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteBroadcast = async (id) => {
    if (!confirm('Delete campaign and all historical logs? This cannot be undone.')) return;
    try {
      const res = await api.delete(`/broadcasts/${id}`);
      if (res.success) fetchBroadcasts();
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Status Badge ─────────────────────────────────────────────────────────

  const getStatusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${cfg.className}`}>
        {status}
      </span>
    );
  };

  // ─── Row Actions ──────────────────────────────────────────────────────────

  const handleOpenReport = async (b) => {
    setSelectedReport(b);
    try {
      const res = await api.get(`/broadcasts/${b._id}`);
      if (res.success && res.data) {
        const fullBroadcast = res.data.broadcast;
        const buttonResponses = res.data.buttonResponses || [];
        setSelectedReport({
          ...fullBroadcast,
          buttonResponses,
        });
      }
    } catch (err) {
      console.error('Failed to fetch full campaign report:', err);
    }
  };

  const RowActions = ({ b }) => {
    const canDispatch = ['DRAFT', 'SCHEDULED'].includes(b.status) && !['PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(b.status);
    const canCancel   = ['DRAFT', 'SCHEDULED'].includes(b.status);

    return (
      <div className="flex items-center justify-end gap-1">
        {/* View Report */}
        <button
          onClick={() => handleOpenReport(b)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-emerald-400 transition-colors"
          title="View Report"
        >
          <BarChart3 className="w-4 h-4" />
        </button>

        {/* Processing → Pause */}
        {b.status === 'PROCESSING' && (
          <button
            onClick={() => handlePauseBroadcast(b._id)}
            className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
            title="Pause"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}

        {/* Paused → Resume */}
        {b.status === 'PAUSED' && (
          <button
            onClick={() => handleResumeBroadcast(b._id)}
            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            title="Resume"
          >
            <Play className="w-4 h-4" />
          </button>
        )}

        {/* Draft → Dispatch */}
        {b.status === 'DRAFT' && (
          <button
            onClick={() => handleExecuteBroadcast(b._id)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold transition-colors"
            title="Dispatch Now"
          >
            <Zap className="w-3.5 h-3.5" /> Dispatch
          </button>
        )}

        {/* Cancel (DRAFT / SCHEDULED) */}
        {canCancel && (
          <button
            onClick={() => handleCancelBroadcast(b._id, b.name)}
            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
            title="Cancel Campaign"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}

        {/* Clone */}
        <button
          onClick={() => handleCloneBroadcast(b._id)}
          className="p-1.5 text-slate-400 hover:text-white transition-colors"
          title="Duplicate"
        >
          <Copy className="w-4 h-4" />
        </button>

        {/* Delete */}
        {!['PROCESSING'].includes(b.status) && (
          <button
            onClick={() => handleDeleteBroadcast(b._id)}
            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Send className="w-6 h-6 text-emerald-600" /> WhatsApp Campaign Manager
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Create audience-targeted broadcasts, schedule dispatches, and track link clicks & CTR.
            </p>
          </div>
          <Button icon={Plus} onClick={() => { resetCreateForm(); setIsCreateOpen(true); }}>
            New Campaign
          </Button>
        </div>

        {/* ── Metrics Overview ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex items-center gap-3 shadow-xs">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Campaigns</p>
              <h3 className="text-lg font-bold text-slate-900">{summary.totalCampaigns}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3 shadow-xs">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Completed</p>
              <h3 className="text-lg font-bold text-slate-900">{summary.completedCount}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3 shadow-xs">
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Scheduled / Active</p>
              <h3 className="text-lg font-bold text-slate-900">{summary.scheduledCount}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3 shadow-xs">
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Dispatched</p>
              <h3 className="text-lg font-bold text-slate-900">{summary.totalSent}</h3>
            </div>
          </Card>
        </div>

        {/* ── Campaign Table ── */}
        <Card title={`Campaign Roster (${broadcasts.length})`} className="shadow-xs">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading campaigns…</div>
          ) : broadcasts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No campaigns yet. Create your first broadcast!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Template</th>
                    <th className="px-4 py-3">Audience</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Sent / Total</th>
                    <th className="px-4 py-3">Clicks</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {broadcasts.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50 transition-colors">
                      {/* Name */}
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 text-xs">{b.name}</p>
                        <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                          {new Date(b.createdAt).toLocaleDateString('en-IN')}
                        </p>
                        {/* Scheduled time indicator */}
                        {b.status === 'SCHEDULED' && b.scheduledAt && (
                          <p className="text-[10px] text-amber-600 font-medium mt-0.5 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            Scheduled for: {formatScheduledAt(b.scheduledAt)}
                          </p>
                        )}
                        {/* Error indicator */}
                        {b.status === 'FAILED' && b.errorMessage && (
                          <p className="text-[10px] text-red-500 mt-0.5 truncate max-w-[180px]" title={b.errorMessage}>
                            ✕ {b.errorMessage}
                          </p>
                        )}
                      </td>

                      {/* Template */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-emerald-400 text-[11px]">{b.templateName}</span>
                        <span className="block text-[10px] text-slate-400">{b.campaignType || 'PROMOTIONAL'}</span>
                      </td>

                      {/* Audience */}
                      <td className="px-4 py-3 text-slate-500">
                        <span className="capitalize">{b.targetType}</span>
                        {b.targetValue && <span className="text-slate-400"> ({b.targetValue})</span>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">{getStatusBadge(b.status)}</td>

                      {/* Sent / Total */}
                      <td className="px-4 py-3 font-mono text-slate-400 font-bold text-[11px]">
                        {b.stats?.sent || 0} / {b.stats?.total || 0}
                      </td>

                      {/* Clicks & Button Responses */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[11px]">
                          <MousePointerClick className="w-3.5 h-3.5 text-teal-400" />
                          <span className="text-teal-400 font-bold">{b.stats?.totalClicks || 0}</span>
                          <span className="text-slate-500">({b.stats?.uniqueClicks || 0} uniq)</span>
                        </div>
                        {(b.rates?.ctr > 0) && (
                          <div className="text-[10px] text-amber-400 font-mono">
                            CTR: {b.rates.ctr}%
                          </div>
                        )}
                        {(b.stats?.buttonClicks > 0) && (
                          <div className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-1">
                            <CheckCheck className="w-3 h-3 text-emerald-400" />
                            <span>{b.stats.acceptCount || 0} Accept</span>
                            <span className="text-slate-500">/</span>
                            <span className="text-rose-400">{b.stats.declineCount || 0} Decline</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <RowActions b={b} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ── Create Broadcast Modal ── */}
        <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); resetCreateForm(); }} title="New WhatsApp Broadcast Campaign" maxWidth="max-w-2xl">
          {createError && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" /> {createError}
            </div>
          )}

          <form onSubmit={handleCreateBroadcast} className="space-y-4 text-xs">

            {/* Campaign name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Campaign Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Festive Sale Offer 2026"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
              />
            </div>

            {/* Type + Template */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Campaign Type</label>
                <select
                  value={campaignType}
                  onChange={(e) => setCampaignType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white"
                >
                  <option value="PROMOTIONAL">PROMOTIONAL</option>
                  <option value="TRANSACTIONAL">TRANSACTIONAL</option>
                  <option value="REENGAGEMENT">REENGAGEMENT</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Meta Template *</label>
                <select
                  required
                  value={templateName}
                  onChange={(e) => {
                    const chosen = templates.find((t) => t.name === e.target.value) || null;
                    setTemplateName(e.target.value);
                    setSelectedTemplate(chosen);
                    setTemplateVariables(chosen ? parseTemplateVariables(chosen) : []);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white"
                >
                  {templates.length === 0 && (
                    <option value="">No approved templates</option>
                  )}
                  {templates.map((t) => (
                    <option key={t._id} value={t.name}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Template preview + variable inputs ── */}
            {selectedTemplate && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5 shadow-xs">
                {/* Body preview */}
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5">Template Body Preview</p>
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-mono text-xs leading-relaxed whitespace-pre-wrap shadow-xs">
                    {getTemplateBodyText(selectedTemplate) || <span className="italic text-slate-400">No body text</span>}
                  </div>
                </div>

                {/* Variable inputs */}
                {templateVariables.length > 0 && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-700 uppercase font-bold tracking-wider">
                        Dynamic Variable Parameter Mappings <span className="text-rose-500">*</span>
                      </p>
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        ⚡ Resolved per recipient at send time
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {templateVariables.map((v, i) => (
                        <div key={v.index} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-0.5 font-extrabold">
                                {`{{${v.index}}}`}
                              </span>
                              <span className="text-xs font-bold text-slate-900">
                                {v.label}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                              Mapped: <span className="text-emerald-700 font-bold">{v.value || '-'}</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-600 mb-1 font-bold">Select Data Field</label>
                              <select
                                value={v.mappingType}
                                onChange={(e) => {
                                  const newType = e.target.value;
                                  const updated = [...templateVariables];
                                  let newValue = newType;
                                  if (newType === '__CUSTOM__') {
                                    newValue = v.customKey ? `{{custom.${v.customKey}}}` : '';
                                  } else if (newType === '__STATIC__') {
                                    newValue = v.staticValue || '';
                                  }
                                  updated[i] = {
                                    ...updated[i],
                                    mappingType: newType,
                                    value: newValue,
                                  };
                                  setTemplateVariables(updated);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                              >
                                {PRESET_VARIABLE_MAPPINGS.map((grp) => (
                                  <optgroup key={grp.group} label={grp.group}>
                                    {grp.items.map((item) => (
                                      <option key={item.value} value={item.value}>
                                        {item.label}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </div>

                            {v.mappingType === '__CUSTOM__' && (
                              <div>
                                <label className="block text-[10px] text-slate-600 mb-1 font-bold">Custom Field Key Name *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. serviceRequestId or invoice_no"
                                  value={v.customKey || ''}
                                  onChange={(e) => {
                                    const key = e.target.value.trim();
                                    const updated = [...templateVariables];
                                    updated[i] = {
                                      ...updated[i],
                                      customKey: key,
                                      value: key ? `{{custom.${key}}}` : '',
                                    };
                                    setTemplateVariables(updated);
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono transition-colors"
                                />
                              </div>
                            )}

                            {v.mappingType === '__STATIC__' && (
                              <div>
                                <label className="block text-[10px] text-slate-600 mb-1 font-bold">Static Text Value *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. 20% OFF or FESTIVE2026"
                                  value={v.staticValue || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const updated = [...templateVariables];
                                    updated[i] = {
                                      ...updated[i],
                                      staticValue: val,
                                      value: val,
                                    };
                                    setTemplateVariables(updated);
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white font-medium transition-colors"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      💡 Each recipient receives their personalized data values for the mapped fields when dispatched.
                    </p>
                  </div>
                )}

                {templateVariables.length === 0 && (
                  <p className="text-[10px] text-emerald-700 font-bold">
                    ✓ No variable parameters — this template sends as-is.
                  </p>
                )}
              </div>
            )}

            {/* Audience */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Target Audience</label>
                <select
                  value={targetType}
                  onChange={(e) => { setTargetType(e.target.value); setTargetValue(''); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white"
                >
                  <option value="all">All Contacts</option>
                  <option value="group">Specific Group</option>
                  <option value="tag">Specific Tag</option>
                </select>
              </div>
              {targetType !== 'all' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {targetType === 'group' ? 'Group Name' : 'Tag Name'}
                  </label>
                  <input
                    type="text"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder={targetType === 'group' ? 'VIP Customers' : 'leads'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              )}
            </div>

            {/* ── Send mode selector ── */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">When to Send</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSendMode('now');
                    setScheduledAt('');   // clear schedule date when switching to Send Now
                    setCreateError('');
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                    sendMode === 'now'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Zap className="w-4 h-4 text-emerald-600" /> Send Now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSendMode('later');
                    setCreateError('');
                    if (!scheduledAt) {
                      const d = new Date(Date.now() + 5 * 60 * 1000);
                      d.setSeconds(0, 0);
                      setScheduledAt(d.toISOString().slice(0, 16));
                    }
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                    sendMode === 'later'
                      ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <CalendarDays className="w-4 h-4 text-amber-600" /> Schedule Later
                </button>
              </div>
            </div>

            {/* Date-time picker (only when schedule later) */}
            {sendMode === 'later' && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                <label className="block text-amber-900 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-amber-700" /> Schedule Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required={sendMode === 'later'}
                  min={minDatetimeLocal()}
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-600"
                />
                <p className="text-[10px] text-amber-700">
                  Time is interpreted in your local timezone. The cron scheduler checks every minute.
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button type="button" variant="secondary" onClick={() => { setIsCreateOpen(false); resetCreateForm(); }}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting} icon={sendMode === 'now' ? Zap : CalendarDays}>
                {submitting
                  ? (sendMode === 'now' ? 'Dispatching…' : 'Scheduling…')
                  : (sendMode === 'now' ? '⚡ Send Now' : '📅 Schedule Campaign')
                }
              </Button>
            </div>
          </form>
        </Modal>

        {/* ── Analytics Report Modal ── */}
        {selectedReport && (
          <Modal
            isOpen={!!selectedReport}
            onClose={() => setSelectedReport(null)}
            title={`Analytics: ${selectedReport.name}`}
          >
            <div className="space-y-4 text-xs">

              {/* Campaign meta */}
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                {getStatusBadge(selectedReport.status)}
                <span className="font-mono">{selectedReport.templateName}</span>
                {selectedReport.status === 'SCHEDULED' && selectedReport.scheduledAt && (
                  <span className="text-amber-400 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {formatScheduledAt(selectedReport.scheduledAt)}
                  </span>
                )}
                {selectedReport.status === 'FAILED' && selectedReport.errorMessage && (
                  <span className="text-red-400 truncate max-w-xs" title={selectedReport.errorMessage}>
                    {selectedReport.errorMessage}
                  </span>
                )}
              </div>

              {/* ── Row 1: Delivery stats ── */}
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2 tracking-wide">Message Delivery</p>
                <div className="grid grid-cols-4 gap-2">
                  <StatCard label="Total" value={selectedReport.stats?.total || 0} color="slate" />
                  <StatCard label="Sent" value={selectedReport.stats?.sent || 0} color="emerald" />
                  <StatCard label="Delivered" value={selectedReport.stats?.delivered || 0} color="sky" />
                  <StatCard label="Failed" value={selectedReport.stats?.failed || 0} color="rose" />
                </div>
              </div>

              {/* ── Row 2: Engagement stats ── */}
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2 tracking-wide">Engagement</p>
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label="Read" value={selectedReport.stats?.read || 0} color="purple" />
                  <StatCard label="Total Clicks" value={selectedReport.stats?.totalClicks || 0} color="teal" />
                  <StatCard label="Unique Clicks" value={selectedReport.stats?.uniqueClicks || 0} color="teal" />
                </div>
              </div>

              {/* ── Row 3: Quick Reply Button Responses ── */}
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2 tracking-wide flex items-center gap-1.5">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Quick Reply Button Responses
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label="Accept Job" value={selectedReport.stats?.acceptCount || 0} color="emerald" />
                  <StatCard label="Decline" value={selectedReport.stats?.declineCount || 0} color="rose" />
                  <StatCard label="Total Responses" value={selectedReport.stats?.buttonClicks || 0} color="teal" />
                </div>
              </div>

              {/* Button response details list */}
              {selectedReport.buttonResponses && selectedReport.buttonResponses.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Button Response Log</p>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                    {selectedReport.buttonResponses.map((resp, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-slate-800 font-bold">{resp.phone}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          (resp.buttonResponse || '').toLowerCase().includes('accept')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : (resp.buttonResponse || '').toLowerCase().includes('decline')
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-teal-50 text-teal-700 border border-teal-200'
                        }`}>
                          {resp.buttonResponse}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {resp.buttonClickedAt ? new Date(resp.buttonClickedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Row 3: Rates ── */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-center font-mono">
                <div>
                  <span className="block text-[10px] text-slate-500 mb-1 font-sans font-medium">Delivery Rate</span>
                  <span className="text-emerald-700 font-extrabold text-sm">
                    {selectedReport.rates?.deliveryRate || 0}%
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 mb-1 font-sans font-medium">Read Rate</span>
                  <span className="text-purple-700 font-extrabold text-sm">
                    {selectedReport.rates?.readRate || 0}%
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 mb-1 font-sans font-medium">
                    CTR
                    <span className="ml-1 text-slate-400 font-normal not-italic">(unique/sent)</span>
                  </span>
                  <span className="text-amber-700 font-extrabold text-sm">
                    {selectedReport.rates?.ctr || 0}%
                  </span>
                </div>
              </div>

              {/* CTR formula note */}
              <p className="text-[10px] text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200">
                <strong className="text-slate-800">CTR formula:</strong> Unique Clicks ÷ Messages Sent × 100.
                A click is <em>unique</em> per contact per campaign (or per IP fingerprint for anonymous users).
                Tracking URLs are embedded in broadcast messages automatically.
              </p>

              <div className="flex justify-end pt-2">
                <Button variant="secondary" onClick={() => setSelectedReport(null)}>
                  Close Report
                </Button>
              </div>
            </div>
          </Modal>
        )}

      </div>
    </DashboardLayout>
  );
}
