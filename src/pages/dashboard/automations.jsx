import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import api from '@/services/api';
import {
  Zap,
  Plus,
  Play,
  Trash2,
  Clock,
  Tag,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Layers,
  GitBranch,
  Globe,
  Bot,
  FileText,
  Save,
  ArrowRight,
  Activity,
} from 'lucide-react';

export default function VisualAutomationBuilder() {
  const [flows, setFlows] = useState([]);
  const [summary, setSummary] = useState({ totalFlows: 0, publishedCount: 0, totalExecutions: 0 });
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [executionLogs, setExecutionLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State for New Flow
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [flowName, setFlowName] = useState('');
  const [triggerKeyword, setTriggerKeyword] = useState('');

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const res = await api.get('/automations');
      if (res.success && res.data) {
        const list = res.data.flows || res.data;
        setFlows(list);
        if (res.data.summary) setSummary(res.data.summary);
        if (list.length > 0 && !selectedFlow) {
          loadFlowDetails(list[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFlowDetails = async (id) => {
    try {
      const res = await api.get(`/automations/${id}`);
      if (res.success && res.data) {
        setSelectedFlow(res.data.flow);
        setNodes(res.data.flow.nodes || []);
        setExecutionLogs(res.data.logs || []);
        if (res.data.flow.nodes?.length > 0) {
          setSelectedNode(res.data.flow.nodes[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  const handleCreateFlow = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/automations', {
        name: flowName,
        triggerKeyword,
      });
      if (res.success && res.data) {
        setIsCreateOpen(false);
        setFlowName('');
        setTriggerKeyword('');
        fetchFlows();
        loadFlowDetails(res.data._id);
      }
    } catch (err) {
      alert(err.message || 'Failed to create automation flow');
    }
  };

  const handleSaveCanvas = async () => {
    if (!selectedFlow) return;
    try {
      const res = await api.put(`/automations/${selectedFlow._id}`, {
        name: selectedFlow.name,
        triggerKeyword: selectedFlow.triggerKeyword,
        nodes,
      });
      if (res.success && res.data) {
        setSelectedFlow(res.data);
        alert('Visual Flow Canvas saved successfully!');
      }
    } catch (err) {
      alert(err.message || 'Failed to save flow canvas');
    }
  };

  const handleTogglePublish = async () => {
    if (!selectedFlow) return;
    try {
      const res = await api.post(`/automations/${selectedFlow._id}/publish`);
      if (res.success) {
        setSelectedFlow((prev) => ({ ...prev, status: res.data.status }));
        fetchFlows();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExecuteTest = async () => {
    if (!selectedFlow) return;
    const phoneInput = window.prompt('Enter target phone number for test execution:', '15551234567');
    if (!phoneInput) return;
    try {
      const res = await api.post(`/automations/${selectedFlow._id}/execute`, { phone: phoneInput });
      if (res.success && res.data) {
        alert('Visual Flow Executed Successfully! Step logs recorded.');
        loadFlowDetails(selectedFlow._id);
      }
    } catch (err) {
      alert(err.message || 'Execution failed');
    }
  };

  const handleAddNode = (type) => {
    const newNode = {
      id: String(Date.now()),
      type,
      label: `Step ${nodes.length + 1}: ${type.toUpperCase()}`,
      position: { x: 100, y: (nodes.length + 1) * 120 },
      data: { text: type === 'message' ? 'Thank you for your reply!' : '' },
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(newNode);
  };

  const handleUpdateSelectedNodeData = (key, val) => {
    if (!selectedNode) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, [key]: val } } : n))
    );
    setSelectedNode((prev) => ({ ...prev, data: { ...prev.data, [key]: val } }));
  };

  const handleDeleteNode = (id) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    if (selectedNode?.id === id) setSelectedNode(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-emerald-400" /> Visual No-Code Automation Builder
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Design visual chatbot workflows, multi-step keyword flows, condition branching, and API integrations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button icon={Plus} onClick={() => setIsCreateOpen(true)}>
              New Automation Flow
            </Button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Visual Workflows</p>
              <h3 className="text-lg font-bold text-white">{summary.totalFlows}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Published Workflows</p>
              <h3 className="text-lg font-bold text-white">{summary.publishedCount}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Executions</p>
              <h3 className="text-lg font-bold text-white">{summary.totalExecutions}</h3>
            </div>
          </Card>
        </div>

        {/* Main Canvas Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-16rem)]">
          {/* Workflows Directory Sidebar */}
          <Card className="flex flex-col space-y-3 overflow-hidden">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">Flows Roster</h3>
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
              {flows.map((f) => {
                const isSelected = selectedFlow?._id === f._id;
                return (
                  <div
                    key={f._id}
                    onClick={() => loadThreadDetails(f._id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white text-xs truncate">{f.name}</p>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          f.status === 'PUBLISHED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {f.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">Keyword: &quot;{f.triggerKeyword}&quot;</p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Visual Canvas Center Viewport */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col overflow-hidden relative">
            {selectedFlow ? (
              <>
                {/* Canvas Control Header */}
                <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      {selectedFlow.name}
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        v{selectedFlow.version || 1}
                      </span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" icon={Save} onClick={handleSaveCanvas}>
                      Save Canvas
                    </Button>

                    <Button
                      size="sm"
                      variant={selectedFlow.status === 'PUBLISHED' ? 'danger' : 'primary'}
                      onClick={handleTogglePublish}
                    >
                      {selectedFlow.status === 'PUBLISHED' ? 'Unpublish' : 'Publish Flow'}
                    </Button>

                    <Button size="sm" icon={Play} onClick={handleExecuteTest}>
                      Test Run
                    </Button>
                  </div>
                </div>

                {/* Canvas Drop Target Area */}
                <div className="flex-1 p-6 bg-slate-950/90 overflow-y-auto space-y-4 relative scrollbar-thin">
                  {nodes.map((node, index) => {
                    const isSelected = selectedNode?.id === node.id;
                    return (
                      <React.Fragment key={node.id}>
                        <div
                          onClick={() => setSelectedNode(node)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all max-w-md mx-auto relative ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              {node.type}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNode(node.id);
                              }}
                              className="text-slate-500 hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="font-semibold text-white text-xs mb-1">{node.label || node.type}</p>
                          {node.data?.text && (
                            <p className="text-xs text-slate-300 font-mono bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                              &quot;{node.data.text}&quot;
                            </p>
                          )}
                        </div>

                        {index < nodes.length - 1 && (
                          <div className="flex justify-center my-1 text-slate-600">
                            <ArrowRight className="w-5 h-5 rotate-90" />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                Select a visual flow from the left roster to view canvas.
              </div>
            )}
          </div>

          {/* Node Palette & Property Inspector (Right Sidebar) */}
          <Card className="flex flex-col space-y-4 overflow-hidden">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-400" /> Add Step Node
              </h4>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button onClick={() => handleAddNode('message')} className="p-2 rounded-xl bg-slate-950 hover:bg-slate-850 text-slate-200 border border-slate-800 text-left">
                  💬 Send Message
                </button>
                <button onClick={() => handleAddNode('template')} className="p-2 rounded-xl bg-slate-950 hover:bg-slate-850 text-slate-200 border border-slate-800 text-left">
                  📜 Send Template
                </button>
                <button onClick={() => handleAddNode('condition')} className="p-2 rounded-xl bg-slate-950 hover:bg-slate-850 text-slate-200 border border-slate-800 text-left">
                  🔀 Condition
                </button>
                <button onClick={() => handleAddNode('delay')} className="p-2 rounded-xl bg-slate-950 hover:bg-slate-850 text-slate-200 border border-slate-800 text-left">
                  ⏱️ Delay Wait
                </button>
                <button onClick={() => handleAddNode('tag_contact')} className="p-2 rounded-xl bg-slate-950 hover:bg-slate-850 text-slate-200 border border-slate-800 text-left">
                  🏷️ Tag Contact
                </button>
                <button onClick={() => handleAddNode('assign_agent')} className="p-2 rounded-xl bg-slate-950 hover:bg-slate-850 text-slate-200 border border-slate-800 text-left">
                  👤 Assign Agent
                </button>
              </div>
            </div>

            {selectedNode && (
              <div className="flex-1 border-t border-slate-800 pt-3 space-y-3 overflow-y-auto scrollbar-thin text-xs">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Node Property Inspector</h4>
                <div>
                  <label className="block text-slate-400 mb-1">Step Label</label>
                  <input
                    type="text"
                    value={selectedNode.label}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, label: val } : n)));
                      setSelectedNode((prev) => ({ ...prev, label: val }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                {selectedNode.type === 'message' && (
                  <div>
                    <label className="block text-slate-400 mb-1">Message Text Body</label>
                    <textarea
                      rows={3}
                      value={selectedNode.data?.text || ''}
                      onChange={(e) => handleUpdateSelectedNodeData('text', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Create Flow Modal */}
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Visual Automation Flow">
          <form onSubmit={handleCreateFlow} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Flow Name *</label>
              <input
                type="text"
                required
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                placeholder="Welcome Onboarding Flow"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Trigger Keyword *</label>
              <input
                type="text"
                required
                value={triggerKeyword}
                onChange={(e) => setTriggerKeyword(e.target.value)}
                placeholder="hi or start or hello"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Initialize Canvas
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
