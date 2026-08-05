import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import api from '@/services/api';
import { Zap, Plus, Play, Trash2, Clock, Tag, UserCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AutomationBuilder() {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('keyword');
  const [triggerValue, setTriggerValue] = useState('pricing');
  const [actionType, setActionType] = useState('tag_contact');
  const [actionValue, setActionValue] = useState('Hot Lead');
  const [submitting, setSubmitting] = useState(false);

  const fetchAutomations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/automations');
      if (res.success && res.data) {
        setAutomations(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const handleCreateAutomation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/automations', {
        name,
        trigger: { type: triggerType, value: triggerValue },
        actions: [{ type: actionType, value: actionValue }],
      });
      if (res.success) {
        setIsCreateOpen(false);
        setName('');
        fetchAutomations();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.put(`/automations/${id}`);
      if (res.success) fetchAutomations();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete rule?')) return;
    try {
      const res = await api.delete(`/automations/${id}`);
      if (res.success) fetchAutomations();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-emerald-400" /> Automation Rules Engine
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure event triggers, action delays, contact tagging, and automated agent assignment.
            </p>
          </div>
          <Button icon={Plus} onClick={() => setIsCreateOpen(true)}>
            Create Automation Rule
          </Button>
        </div>

        <Card title={`Active Rules (${automations.length})`}>
          <div className="space-y-3">
            {automations.map((rule) => (
              <div
                key={rule._id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white text-sm">{rule.name}</h3>
                    <span
                      onClick={() => handleToggle(rule._id)}
                      className={`cursor-pointer px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                        rule.isActive
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {rule.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Trigger: <span className="text-emerald-400">{rule.trigger?.type}</span> (&quot;{rule.trigger?.value}&quot;)
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                    Action: {(rule.actions || []).map((a) => `${a.type} -> ${a.value}`).join(', ')}
                  </div>
                  <button
                    onClick={() => handleDelete(rule._id)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Create Rule Modal */}
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Automation Rule">
          <form onSubmit={handleCreateAutomation} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Rule Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tag Pricing Leads"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Trigger Type
                </label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="keyword">Keyword in Message</option>
                  <option value="new_chat">New Customer Chat</option>
                  <option value="tag_added">Tag Added to Contact</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Trigger Keyword / Tag
                </label>
                <input
                  type="text"
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  placeholder="pricing"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Action Executed
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="tag_contact">Tag Contact</option>
                  <option value="assign_agent">Assign Agent</option>
                  <option value="delay">Delay (seconds)</option>
                  <option value="webhook">Trigger Webhook</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Action Parameter Value
                </label>
                <input
                  type="text"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  placeholder="Hot Lead or Tag Name"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Save Rule
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
