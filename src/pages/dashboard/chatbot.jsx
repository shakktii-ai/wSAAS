import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import api from '@/services/api';
import { Bot, Plus, Play, Trash2, ArrowRight, Settings2, Code, FileText, CheckCircle2, Layers } from 'lucide-react';

export default function ChatbotBuilder() {
  const [flows, setFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const [name, setName] = useState('');
  const [triggerKeyword, setTriggerKeyword] = useState('help');
  const [submitting, setSubmitting] = useState(false);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const res = await api.get('/chatbot/flows');
      if (res.success && res.data) {
        setFlows(res.data);
        if (res.data.length > 0 && !selectedFlow) {
          setSelectedFlow(res.data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  const handleCreateFlow = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/chatbot/flows', { name, triggerKeyword });
      if (res.success) {
        setIsCreateOpen(false);
        setName('');
        fetchFlows();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFlow = async (id) => {
    if (!confirm('Delete this chatbot flow?')) return;
    try {
      const res = await api.delete(`/chatbot/flows/${id}`);
      if (res.success) {
        setSelectedFlow(null);
        fetchFlows();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Bot className="w-6 h-6 text-emerald-400" /> Visual Chatbot Builder
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Design automated decision trees, interactive button lists, conditions, and API webhook integrations.
            </p>
          </div>
          <Button icon={Plus} onClick={() => setIsCreateOpen(true)}>
            Create New Bot Flow
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Flow List Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            <Card title={`Bot Workflows (${flows.length})`}>
              <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
                {flows.map((flow) => {
                  const isSelected = selectedFlow?._id === flow._id;
                  return (
                    <div
                      key={flow._id}
                      onClick={() => setSelectedFlow(flow)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-xs text-white">{flow.name}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400">
                          !{flow.triggerKeyword || 'default'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" /> {flow.nodes?.length || 0} Flow Nodes
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Visual Canvas Display */}
          <div className="lg:col-span-8">
            {selectedFlow ? (
              <Card
                title={`Canvas: ${selectedFlow.name}`}
                subtitle={`Trigger Keyword: !${selectedFlow.triggerKeyword || 'none'}`}
                action={
                  <Button
                    size="sm"
                    variant="danger"
                    icon={Trash2}
                    onClick={() => handleDeleteFlow(selectedFlow._id)}
                  >
                    Delete Flow
                  </Button>
                }
              >
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Flow Execution Nodes
                    </h4>

                    {(selectedFlow.nodes || []).map((node, index) => (
                      <div
                        key={node.id || index}
                        className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 relative"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/30">
                            Node #{index + 1}: {node.type}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{node.id}</span>
                        </div>

                        <p className="text-xs font-semibold text-white">{node.title || 'Step Title'}</p>
                        <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 font-mono">
                          {node.content}
                        </p>

                        {node.buttons && node.buttons.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {node.buttons.map((b, bIdx) => (
                              <span key={bIdx} className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                🔘 {b.title} → {b.nextNodeId || 'End'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs">
                Select or create a bot workflow to view the canvas nodes.
              </div>
            )}
          </div>
        </div>

        {/* Create Flow Modal */}
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Visual Bot Flow">
          <form onSubmit={handleCreateFlow} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Flow Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer Onboarding Assistant"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Trigger Keyword (Incoming message)
              </label>
              <input
                type="text"
                value={triggerKeyword}
                onChange={(e) => setTriggerKeyword(e.target.value)}
                placeholder="start or help"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Initialize Flow
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
