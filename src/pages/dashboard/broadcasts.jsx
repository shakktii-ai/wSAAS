import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import api from '@/services/api';
import { Send, Plus, Play, CheckCircle2, Clock, AlertCircle, BarChart3, Users, CheckCheck } from 'lucide-react';

export default function BroadcastsManager() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [targetValue, setTargetValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Selected Report State
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/broadcasts');
      if (res.success && res.data) {
        setBroadcasts(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/whatsapp/templates');
      if (res.success && res.data) {
        setTemplates(res.data);
        if (res.data.length > 0) {
          setTemplateName(res.data[0].name);
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
        templateName,
        targetType,
        targetValue,
      });

      if (res.success) {
        setIsCreateOpen(false);
        setName('');
        fetchBroadcasts();
      }
    } catch (err) {
      setCreateError(err.message || 'Failed to create broadcast campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteBroadcast = async (id) => {
    if (!confirm('Dispatch campaign to target WhatsApp contacts now?')) return;
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

  const getStatusBadge = (status) => {
    const badges = {
      COMPLETED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      PROCESSING: 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse',
      SCHEDULED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
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
              <Send className="w-6 h-6 text-emerald-400" /> WhatsApp Broadcast Campaigns
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Create target audience campaigns, schedule dispatches, and track realtime delivery reports.
            </p>
          </div>
          <Button icon={Plus} onClick={() => setIsCreateOpen(true)}>
            New Broadcast Campaign
          </Button>
        </div>

        {/* Campaigns List */}
        <Card title={`Campaign Roster (${broadcasts.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Campaign Name</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Target Audience</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Dispatched / Total</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {broadcasts.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-white">
                      {b.name}
                      <p className="text-[11px] text-slate-400 font-normal">
                        Created {new Date(b.createdAt).toLocaleDateString()}
                      </p>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs text-emerald-400">{b.templateName}</td>

                    <td className="px-4 py-3.5 text-xs text-slate-300">
                      <span className="capitalize">{b.targetType}</span>
                      {b.targetValue && <span className="text-slate-500"> ({b.targetValue})</span>}
                    </td>

                    <td className="px-4 py-3.5">{getStatusBadge(b.status)}</td>

                    <td className="px-4 py-3.5 text-xs font-mono text-slate-200">
                      {b.stats?.sent || 0} / {b.stats?.total || 0}
                    </td>

                    <td className="px-4 py-3.5 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedReport(b)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-emerald-400 transition-colors"
                        title="View Report"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>

                      {b.status !== 'COMPLETED' && (
                        <Button
                          size="sm"
                          variant="primary"
                          icon={Play}
                          onClick={() => handleExecuteBroadcast(b._id)}
                        >
                          Dispatch
                        </Button>
                      )}
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

          <form onSubmit={handleCreateBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Campaign Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product Launch Announcement"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Select Pre-Approved Meta Template *
              </label>
              <select
                required
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              >
                {templates.map((t) => (
                  <option key={t._id} value={t.name}>
                    {t.name} ({t.category} - {t.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Target Audience
                </label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="all">All Contacts</option>
                  <option value="group">Specific Group</option>
                  <option value="tag">Specific Tag</option>
                </select>
              </div>

              {targetType !== 'all' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Group / Tag Name
                  </label>
                  <input
                    type="text"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="VIP or Customers"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
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
          <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title={`Broadcast Analytics Report: ${selectedReport.name}`}>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Target</p>
                  <p className="text-xl font-bold text-white mt-1">{selectedReport.stats?.total || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-[10px] text-emerald-400 font-semibold uppercase">Sent</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{selectedReport.stats?.sent || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                  <p className="text-[10px] text-sky-400 font-semibold uppercase">Delivered</p>
                  <p className="text-xl font-bold text-sky-400 mt-1">{selectedReport.stats?.delivered || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <p className="text-[10px] text-rose-400 font-semibold uppercase">Failed</p>
                  <p className="text-xl font-bold text-rose-400 mt-1">{selectedReport.stats?.failed || 0}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1 text-slate-300">
                <p>Template Used: <span className="text-white font-mono">{selectedReport.templateName}</span></p>
                <p>Dispatched At: <span className="text-white">{selectedReport.startedAt ? new Date(selectedReport.startedAt).toLocaleString() : 'N/A'}</span></p>
                <p>Status: <span className="text-emerald-400 font-semibold">{selectedReport.status}</span></p>
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
