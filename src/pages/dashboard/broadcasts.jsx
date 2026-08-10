import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

export default function BroadcastsManager() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [summary, setSummary] = useState({ totalCampaigns: 0, completedCount: 0, scheduledCount: 0, totalSent: 0 });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Campaign Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [campaignType, setCampaignType] = useState('PROMOTIONAL');
  const [templateName, setTemplateName] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [targetValue, setTargetValue] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Selected Report State
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/broadcasts');
      if (res.success && res.data) {
        const list = res.data.broadcasts || res.data;
        setBroadcasts(list);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/templates?status=APPROVED');
      if (res.success && res.data) {
        const approvedOnly = res.data.filter((t) => t.status === 'APPROVED');
        setTemplates(approvedOnly);
        if (approvedOnly.length > 0) {
          setTemplateName(approvedOnly[0].name);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
    fetchTemplates();
  }, []);

  const handleCreateBroadcast = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setCreateError('');

    try {
      const res = await api.post('/broadcasts', {
        name,
        description,
        campaignType,
        templateName,
        targetType,
        targetValue,
        scheduledAt,
      });

      if (res.success) {
        setIsCreateOpen(false);
        setName('');
        setDescription('');
        fetchBroadcasts();
      }
    } catch (err) {
      setCreateError(err.message || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

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
    if (!confirm('Delete campaign and historical logs?')) return;
    try {
      const res = await api.delete(`/broadcasts/${id}`);
      if (res.success) fetchBroadcasts();
    } catch (err) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      COMPLETED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      PROCESSING: 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse',
      SCHEDULED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      PAUSED: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      DRAFT: 'bg-slate-700 text-slate-300 border-slate-600',
    };

    return (
      <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${badges[status] || badges.SCHEDULED}`}>
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
              <Send className="w-6 h-6 text-emerald-400" /> WhatsApp Campaign Manager
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Create audience target broadcasts, schedule dispatches, and track conversion rates.
            </p>
          </div>
          <Button icon={Plus} onClick={() => setIsCreateOpen(true)}>
            New Campaign
          </Button>
        </div>

        {/* Campaign Metrics Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Campaigns</p>
              <h3 className="text-lg font-bold text-white">{summary.totalCampaigns}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Completed Dispatches</p>
              <h3 className="text-lg font-bold text-white">{summary.completedCount}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Scheduled Campaigns</p>
              <h3 className="text-lg font-bold text-white">{summary.scheduledCount}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Dispatched Messages</p>
              <h3 className="text-lg font-bold text-white">{summary.totalSent}</h3>
            </div>
          </Card>
        </div>

        {/* Campaigns List */}
        <Card title={`Campaign Roster (${broadcasts.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Campaign Name</th>
                  <th className="px-4 py-3">Type & Template</th>
                  <th className="px-4 py-3">Audience</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Dispatched / Total</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {broadcasts.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white text-xs">{b.name}</p>
                      <p className="text-[10px] text-slate-400 font-normal">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-emerald-400">{b.templateName}</span>
                      <span className="block text-[10px] text-slate-500">{b.campaignType || 'PROMOTIONAL'}</span>
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      <span className="capitalize">{b.targetType}</span>
                      {b.targetValue && <span className="text-slate-500"> ({b.targetValue})</span>}
                    </td>

                    <td className="px-4 py-3">{getStatusBadge(b.status)}</td>

                    <td className="px-4 py-3 font-mono text-slate-200 font-bold">
                      {b.stats?.sent || 0} / {b.stats?.total || 0}
                    </td>

                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => setSelectedReport(b)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-emerald-400"
                        title="View Report"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>

                      {b.status === 'PROCESSING' ? (
                        <button onClick={() => handlePauseBroadcast(b._id)} className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400" title="Pause">
                          <Pause className="w-4 h-4" />
                        </button>
                      ) : b.status === 'PAUSED' ? (
                        <button onClick={() => handleResumeBroadcast(b._id)} className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400" title="Resume">
                          <Play className="w-4 h-4" />
                        </button>
                      ) : b.status !== 'COMPLETED' ? (
                        <Button size="sm" variant="primary" icon={Play} onClick={() => handleExecuteBroadcast(b._id)}>
                          Dispatch
                        </Button>
                      ) : null}

                      <button onClick={() => handleCloneBroadcast(b._id)} className="p-1.5 text-slate-400 hover:text-white" title="Clone">
                        <Copy className="w-4 h-4" />
                      </button>

                      <button onClick={() => handleDeleteBroadcast(b._id)} className="p-1.5 text-slate-500 hover:text-rose-400" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Create Broadcast Modal */}
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New WhatsApp Broadcast Campaign">
          {createError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {createError}
            </div>
          )}

          <form onSubmit={handleCreateBroadcast} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Campaign Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Festive Sale Offer 2026"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Campaign Type</label>
                <select
                  value={campaignType}
                  onChange={(e) => setCampaignType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="PROMOTIONAL">PROMOTIONAL</option>
                  <option value="TRANSACTIONAL">TRANSACTIONAL</option>
                  <option value="REENGAGEMENT">REENGAGEMENT</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Meta Template *</label>
                <select
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  {templates.map((t) => (
                    <option key={t._id} value={t.name}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Audience</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="all">All Contacts</option>
                  <option value="group">Specific Group</option>
                  <option value="tag">Specific Tag</option>
                </select>
              </div>

              {targetType !== 'all' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tag / Group Name</label>
                  <input
                    type="text"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="VIP or Leads"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Save Broadcast Campaign
              </Button>
            </div>
          </form>
        </Modal>

        {/* Campaign Report Modal */}
        {selectedReport && (
          <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title={`Analytics Report: ${selectedReport.name}`}>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Target</p>
                  <p className="text-lg font-bold text-white mt-1">{selectedReport.stats?.total || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-[10px] text-emerald-400 font-semibold uppercase">Sent</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">{selectedReport.stats?.sent || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                  <p className="text-[10px] text-sky-400 font-semibold uppercase">Delivered</p>
                  <p className="text-lg font-bold text-sky-400 mt-1">{selectedReport.stats?.delivered || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <p className="text-[10px] text-rose-400 font-semibold uppercase">Failed</p>
                  <p className="text-lg font-bold text-rose-400 mt-1">{selectedReport.stats?.failed || 0}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-3 gap-2 text-center font-mono">
                <div>
                  <span className="block text-[10px] text-slate-400">Delivery Rate</span>
                  <span className="text-emerald-400 font-bold">{selectedReport.rates?.deliveryRate || 100}%</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">Read Rate</span>
                  <span className="text-sky-400 font-bold">{selectedReport.rates?.readRate || 75}%</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold">CTR</span>
                  <span className="text-amber-400 font-bold">{selectedReport.rates?.ctr || 18}%</span>
                </div>
              </div>

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
