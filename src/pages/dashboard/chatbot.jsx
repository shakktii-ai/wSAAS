import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/services/api';
import {
  Bot, Plus, Trash2, Save, X, Copy, ChevronDown, ChevronUp,
  Layers, Settings2, AlertTriangle, CheckCircle2, Zap,
  MessageSquare, GitBranch, Timer, Tag, User, Globe,
  ArrowRight, Edit3, MoreVertical, GripVertical, Eye, EyeOff,
} from 'lucide-react';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const NODE_TYPES = [
  { type: 'text',        label: 'Text Message',     icon: MessageSquare, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { type: 'buttons',     label: 'Button Menu',       icon: GitBranch,     color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  { type: 'list',        label: 'List Picker',       icon: Layers,        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  { type: 'quick_reply', label: 'Quick Reply',       icon: Zap,           color: '#06b6d4', bg: 'rgba(6,182,212,0.12)'  },
  { type: 'condition',   label: 'Condition',         icon: GitBranch,     color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  { type: 'media',       label: 'Media',             icon: Eye,           color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { type: 'api',         label: 'API Webhook',       icon: Globe,         color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { type: 'webhook',     label: 'Webhook Trigger',   icon: Globe,         color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
];

const getNodeMeta = (type) => NODE_TYPES.find((n) => n.type === type) || NODE_TYPES[0];

function genId() {
  return `node_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function defaultNode(type) {
  return {
    id: genId(),
    type,
    title: getNodeMeta(type).label,
    content: '',
    mediaUrl: '',
    buttons: [],
    listItems: [],
    condition: { variableName: '', operator: 'equals', value: '', trueNextNodeId: '', falseNextNodeId: '' },
    webhookUrl: '',
    nextNodeId: '',
  };
}

// ─── INLINE INPUT STYLES ─────────────────────────────────────────────────────

const inp = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 transition-colors placeholder-slate-400';
const label = 'block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1';
const sectionLabel = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2';

// ─── NODE TYPE BADGE ─────────────────────────────────────────────────────────

function NodeBadge({ type }) {
  const meta = getNodeMeta(type);
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
      style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}
    >
      <Icon style={{ width: 10, height: 10 }} />
      {meta.label}
    </span>
  );
}

// ─── NODE INSPECTOR MODAL ────────────────────────────────────────────────────

function NodeInspector({ node, onClose, onSave, allNodeIds }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(node)));

  const set = (field, value) => setDraft((d) => ({ ...d, [field]: value }));
  const setCondField = (field, value) =>
    setDraft((d) => ({ ...d, condition: { ...(d.condition || {}), [field]: value } }));

  // Buttons
  const addButton = () =>
    setDraft((d) => ({
      ...d,
      buttons: [...(d.buttons || []), { id: `btn_${Date.now()}`, title: '', nextNodeId: '' }],
    }));
  const removeButton = (i) =>
    setDraft((d) => ({ ...d, buttons: d.buttons.filter((_, idx) => idx !== i) }));
  const setButton = (i, field, value) =>
    setDraft((d) => {
      const btns = [...(d.buttons || [])];
      btns[i] = { ...btns[i], [field]: value };
      return { ...d, buttons: btns };
    });

  // List items
  const addListItem = () =>
    setDraft((d) => ({
      ...d,
      listItems: [...(d.listItems || []), { id: `li_${Date.now()}`, title: '', description: '', nextNodeId: '' }],
    }));
  const removeListItem = (i) =>
    setDraft((d) => ({ ...d, listItems: d.listItems.filter((_, idx) => idx !== i) }));
  const setListItem = (i, field, value) =>
    setDraft((d) => {
      const items = [...(d.listItems || [])];
      items[i] = { ...items[i], [field]: value };
      return { ...d, listItems: items };
    });

  const handleSave = () => onSave(draft);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-slate-950/85 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: 'calc(100vh - 6rem)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <Edit3 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Node Inspector</span>
            <NodeBadge type={draft.type} />
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {/* Node Type Selector */}
          <div>
            <label className={label}>Node Type</label>
            <select value={draft.type} onChange={(e) => set('type', e.target.value)} className={inp}>
              {NODE_TYPES.map((t) => (
                <option key={t.type} value={t.type}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Node Title */}
          <div>
            <label className={label}>Node Title</label>
            <input value={draft.title || ''} onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Welcome Message" className={inp} />
          </div>

          {/* Message Content */}
          {['text', 'buttons', 'list', 'quick_reply', 'media'].includes(draft.type) && (
            <div>
              <label className={label}>Message Text</label>
              <textarea
                rows={3}
                value={draft.content || ''}
                onChange={(e) => set('content', e.target.value)}
                placeholder="Type your WhatsApp message here..."
                className={inp + ' resize-none'}
              />
            </div>
          )}

          {/* Media URL */}
          {draft.type === 'media' && (
            <div>
              <label className={label}>Media URL</label>
              <input value={draft.mediaUrl || ''} onChange={(e) => set('mediaUrl', e.target.value)}
                placeholder="https://example.com/image.jpg" className={inp} />
            </div>
          )}

          {/* Buttons */}
          {['buttons', 'quick_reply'].includes(draft.type) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={sectionLabel}>Reply Buttons (max 3)</span>
                {(draft.buttons || []).length < 3 && (
                  <button onClick={addButton}
                    className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                    + Add Button
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {(draft.buttons || []).map((btn, i) => (
                  <div key={btn.id || i} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={btn.title || ''}
                        onChange={(e) => setButton(i, 'title', e.target.value)}
                        placeholder="Button label"
                        className={inp + ' flex-1'}
                      />
                      <button onClick={() => removeButton(i)} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                      <select value={btn.nextNodeId || ''} onChange={(e) => setButton(i, 'nextNodeId', e.target.value)} className={inp + ' flex-1'}>
                        <option value="">→ End Flow</option>
                        {allNodeIds.filter((id) => id !== draft.id).map((id) => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List Items */}
          {draft.type === 'list' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={sectionLabel}>List Items (max 10)</span>
                {(draft.listItems || []).length < 10 && (
                  <button onClick={addListItem}
                    className="text-[10px] px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors">
                    + Add Item
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {(draft.listItems || []).map((item, i) => (
                  <div key={item.id || i} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <input value={item.title || ''} onChange={(e) => setListItem(i, 'title', e.target.value)}
                        placeholder="Item title" className={inp + ' flex-1'} />
                      <button onClick={() => removeListItem(i)} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input value={item.description || ''} onChange={(e) => setListItem(i, 'description', e.target.value)}
                      placeholder="Item description (optional)" className={inp} />
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                      <select value={item.nextNodeId || ''} onChange={(e) => setListItem(i, 'nextNodeId', e.target.value)} className={inp + ' flex-1'}>
                        <option value="">→ End Flow</option>
                        {allNodeIds.filter((id) => id !== draft.id).map((id) => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Condition Node */}
          {draft.type === 'condition' && (
            <div className="space-y-3 p-3 rounded-xl bg-slate-950/50 border border-pink-500/20">
              <span className={sectionLabel}>Condition Logic</span>
              <div>
                <label className={label}>Operator</label>
                <select value={(draft.condition || {}).operator || 'equals'} onChange={(e) => setCondField('operator', e.target.value)} className={inp}>
                  <option value="equals">Equals</option>
                  <option value="contains">Contains</option>
                  <option value="starts_with">Starts With</option>
                  <option value="ends_with">Ends With</option>
                </select>
              </div>
              <div>
                <label className={label}>Match Value</label>
                <input value={(draft.condition || {}).value || ''} onChange={(e) => setCondField('value', e.target.value)}
                  placeholder="e.g. yes, order, help" className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={label}>✓ True → Next Node</label>
                  <select value={(draft.condition || {}).trueNextNodeId || ''} onChange={(e) => setCondField('trueNextNodeId', e.target.value)} className={inp}>
                    <option value="">→ End</option>
                    {allNodeIds.filter((id) => id !== draft.id).map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>✗ False → Next Node</label>
                  <select value={(draft.condition || {}).falseNextNodeId || ''} onChange={(e) => setCondField('falseNextNodeId', e.target.value)} className={inp}>
                    <option value="">→ End</option>
                    {allNodeIds.filter((id) => id !== draft.id).map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* API / Webhook Node */}
          {['api', 'webhook'].includes(draft.type) && (
            <div>
              <label className={label}>Webhook / API URL</label>
              <input value={draft.webhookUrl || ''} onChange={(e) => set('webhookUrl', e.target.value)}
                placeholder="https://your-api.com/webhook" className={inp} />
            </div>
          )}

          {/* Next Node ID (for simple non-branching nodes) */}
          {!['buttons', 'quick_reply', 'list', 'condition'].includes(draft.type) && (
            <div>
              <label className={label}>Next Node (on completion)</label>
              <select value={draft.nextNodeId || ''} onChange={(e) => set('nextNodeId', e.target.value)} className={inp}>
                <option value="">→ End Flow</option>
                {allNodeIds.filter((id) => id !== draft.id).map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>
          )}

          {/* Node ID (read-only info) */}
          <div className="pt-1">
            <label className={label}>Node ID (read-only)</label>
            <div className="px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-800 text-[11px] font-mono text-slate-500">{draft.id}</div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2.5 px-5 py-3.5 border-t border-slate-800 bg-slate-950/30 shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave}
            className="px-4 py-2 text-sm rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-colors flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NODE CARD (on the canvas) ────────────────────────────────────────────────

function NodeCard({ node, index, total, onEdit, onDelete, onDuplicate, onMoveUp, onMoveDown }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = getNodeMeta(node.type);
  const Icon = meta.icon;

  return (
    <div
      className="group relative rounded-2xl border transition-all duration-200 cursor-pointer hover:shadow-md bg-white"
      style={{ borderColor: meta.color + '60' }}
      onDoubleClick={() => onEdit(node)}
    >
      {/* Drag handle + top bar */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2.5">
          <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
            style={{ background: meta.color + '15', color: meta.color, border: `1px solid ${meta.color}40` }}>
            <Icon style={{ width: 10, height: 10 }} />
            {meta.label}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">#{index + 1}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Edit button (always visible) */}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(node); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
            title="Edit node"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {/* Context menu */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((p) => !p); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-30 w-40 rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden text-xs"
                onMouseLeave={() => setMenuOpen(false)}>
                <button onClick={() => { setMenuOpen(false); onEdit(node); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors font-medium">
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" /> Edit Node
                </button>
                <button onClick={() => { setMenuOpen(false); onDuplicate(node); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors font-medium">
                  <Copy className="w-3.5 h-3.5 text-slate-500" /> Duplicate Node
                </button>
                {index > 0 && (
                  <button onClick={() => { setMenuOpen(false); onMoveUp(index); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors font-medium">
                    <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> Move Up
                  </button>
                )}
                {index < total - 1 && (
                  <button onClick={() => { setMenuOpen(false); onMoveDown(index); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors font-medium">
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> Move Down
                  </button>
                )}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button onClick={() => { setMenuOpen(false); onDelete(node.id); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors font-bold">
                    <Trash2 className="w-3.5 h-3.5" /> Delete Node
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Node Title */}
      <div className="px-4 pb-1">
        <p className="text-sm font-bold text-slate-900">{node.title || '(Untitled)'}</p>
      </div>

      {/* Content Preview */}
      {node.content && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-700 line-clamp-2 font-mono leading-relaxed">{node.content}</p>
        </div>
      )}

      {/* Media URL */}
      {node.mediaUrl && (
        <div className="mx-4 mb-2 px-2 py-1 rounded bg-purple-50 border border-purple-200">
          <p className="text-[10px] text-purple-700 truncate font-mono">🖼 {node.mediaUrl}</p>
        </div>
      )}

      {/* Buttons preview */}
      {node.buttons && node.buttons.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {node.buttons.map((b, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-800 border border-slate-200 font-bold">
              {b.title || '(empty)'} {b.nextNodeId && <ArrowRight className="w-2.5 h-2.5 text-emerald-600" />} {b.nextNodeId ? <span className="font-mono text-emerald-700">{b.nextNodeId.slice(-8)}</span> : 'End'}
            </span>
          ))}
        </div>
      )}

      {/* List items count */}
      {node.listItems && node.listItems.length > 0 && (
        <div className="px-4 pb-2">
          <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
            📋 {node.listItems.length} list item{node.listItems.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Condition preview */}
      {node.type === 'condition' && node.condition && (
        <div className="px-4 pb-2 grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
            ✓ {node.condition.trueNextNodeId?.slice(-8) || 'End'}
          </div>
          <div className="px-2 py-1 rounded bg-rose-50 border border-rose-200 text-rose-800 font-bold">
            ✗ {node.condition.falseNextNodeId?.slice(-8) || 'End'}
          </div>
        </div>
      )}

      {/* Webhook URL */}
      {node.webhookUrl && (
        <div className="mx-4 mb-2 px-2 py-1 rounded bg-orange-50 border border-orange-200">
          <p className="text-[10px] text-orange-800 truncate font-mono">🌐 {node.webhookUrl}</p>
        </div>
      )}

      {/* Next node connector */}
      {node.nextNodeId && !['buttons', 'quick_reply', 'list', 'condition'].includes(node.type) && (
        <div className="px-4 pb-3 flex items-center gap-1.5">
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="text-[10px] text-slate-600 font-mono font-bold">{node.nextNodeId}</span>
        </div>
      )}

      {/* Double-click hint */}
      <div className="absolute bottom-2 right-3 text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
        double-click to edit
      </div>

      {/* Arrow connector to next card */}
      {index < total - 1 && (
        <div className="flex justify-center py-0 -my-1 pointer-events-none relative z-10">
          <div className="w-px h-4 bg-slate-300" />
        </div>
      )}
    </div>
  );
}

// ─── ADD NODE PALETTE ─────────────────────────────────────────────────────────

function AddNodePalette({ onAdd }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:border-emerald-600 hover:text-emerald-700 transition-all text-xs font-bold bg-slate-50 hover:bg-emerald-50/50"
      >
        <Plus className="w-4 h-4 text-emerald-600" /> Add Node
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-2 z-20 grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-white border border-slate-200 shadow-xl">
          {NODE_TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.type}
                onClick={() => { onAdd(t.type); setOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors hover:bg-slate-50 text-slate-800 font-medium"
              >
                <Icon style={{ width: 12, height: 12, color: t.color }} />
                {t.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ChatbotBuilder() {
  const [flows, setFlows]               = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [editedFlow, setEditedFlow]     = useState(null);   // mutable working copy
  const [isDirty, setIsDirty]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [loading, setLoading]           = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [inspecting, setInspecting]     = useState(null);   // node being inspected
  const [saveError, setSaveError]       = useState('');
  const [saveOk, setSaveOk]             = useState(false);
  const [newName, setNewName]           = useState('');
  const [newTrigger, setNewTrigger]     = useState('help');
  const [submitting, setSubmitting]     = useState(false);

  // ─ Fetch ─
  const fetchFlows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/chatbot/flows');
      if (res.success && res.data) {
        setFlows(res.data);
        if (res.data.length > 0 && !selectedFlow) {
          const first = res.data[0];
          setSelectedFlow(first);
          setEditedFlow(JSON.parse(JSON.stringify(first)));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFlows(); }, []);

  // ─ Select flow ─
  const handleSelectFlow = (flow) => {
    if (isDirty && !confirm('You have unsaved changes. Discard them?')) return;
    setSelectedFlow(flow);
    setEditedFlow(JSON.parse(JSON.stringify(flow)));
    setIsDirty(false);
    setSaveOk(false);
    setSaveError('');
  };

  // ─ Mutation helpers ─
  const mutate = (updater) => {
    setEditedFlow((prev) => {
      const next = updater(JSON.parse(JSON.stringify(prev)));
      return next;
    });
    setIsDirty(true);
  };

  // ─ Flow meta edits ─
  const setFlowName    = (v) => mutate((f) => { f.name = v; return f; });
  const setFlowTrigger = (v) => mutate((f) => { f.triggerKeyword = v; return f; });
  const setFlowActive  = (v) => mutate((f) => { f.isActive = v; return f; });

  // ─ Node ops ─
  const handleAddNode    = (type) => mutate((f) => { f.nodes.push(defaultNode(type)); return f; });
  const handleDeleteNode = (id)   => { if (!confirm('Delete this node?')) return; mutate((f) => { f.nodes = f.nodes.filter((n) => n.id !== id); return f; }); };
  const handleDuplicate  = (node) => mutate((f) => { f.nodes.push({ ...JSON.parse(JSON.stringify(node)), id: genId(), title: node.title + ' (copy)' }); return f; });
  const handleMoveUp     = (idx)  => mutate((f) => { [f.nodes[idx - 1], f.nodes[idx]] = [f.nodes[idx], f.nodes[idx - 1]]; return f; });
  const handleMoveDown   = (idx)  => mutate((f) => { [f.nodes[idx], f.nodes[idx + 1]] = [f.nodes[idx + 1], f.nodes[idx]]; return f; });

  // ─ Inspector ─
  const handleOpenInspector = (node) => setInspecting(node);
  const handleInspectorSave = (updatedNode) => {
    mutate((f) => {
      f.nodes = f.nodes.map((n) => n.id === updatedNode.id ? updatedNode : n);
      return f;
    });
    setInspecting(null);
  };

  // ─ Save ─
  const handleSave = async () => {
    if (!editedFlow) return;
    setSaving(true);
    setSaveError('');
    setSaveOk(false);
    try {
      const res = await api.put(`/chatbot/flows/${editedFlow._id}`, {
        name: editedFlow.name,
        triggerKeyword: editedFlow.triggerKeyword,
        nodes: editedFlow.nodes,
        isActive: editedFlow.isActive,
      });
      if (res.success) {
        setSelectedFlow(res.data || editedFlow);
        setEditedFlow(JSON.parse(JSON.stringify(res.data || editedFlow)));
        setFlows((prev) => prev.map((f) => f._id === editedFlow._id ? (res.data || editedFlow) : f));
        setIsDirty(false);
        setSaveOk(true);
        setTimeout(() => setSaveOk(false), 3000);
      } else {
        setSaveError(res.message || 'Save failed');
      }
    } catch (err) {
      setSaveError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ─ Cancel ─
  const handleCancel = () => {
    if (!confirm('Discard all unsaved changes?')) return;
    setEditedFlow(JSON.parse(JSON.stringify(selectedFlow)));
    setIsDirty(false);
    setSaveError('');
  };

  // ─ Delete flow ─
  const handleDeleteFlow = async (id) => {
    if (!confirm('Permanently delete this chatbot flow?')) return;
    try {
      const res = await api.delete(`/chatbot/flows/${id}`);
      if (res.success) {
        setSelectedFlow(null);
        setEditedFlow(null);
        setIsDirty(false);
        fetchFlows();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // ─ Create flow ─
  const handleCreateFlow = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/chatbot/flows', { name: newName, triggerKeyword: newTrigger });
      if (res.success) {
        setIsCreateOpen(false);
        setNewName('');
        setNewTrigger('help');
        await fetchFlows();
        if (res.data) {
          setSelectedFlow(res.data);
          setEditedFlow(JSON.parse(JSON.stringify(res.data)));
        }
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const allNodeIds = (editedFlow?.nodes || []).map((n) => n.id);

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-600" />
              Visual Chatbot Builder
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Build visual WhatsApp chatbot flows. Double-click any node to edit. Changes auto-persist to MongoDB.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" /> Create New Flow
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* ── Left Sidebar — Flow List ── */}
          <div className="lg:col-span-3 space-y-3">
            <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                  Bot Workflows ({flows.length})
                </span>
              </div>
              <div className="p-2 space-y-1.5 max-h-[70vh] overflow-y-auto">
                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-500">Loading flows...</div>
                ) : flows.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 font-medium">No flows yet. Create one to begin.</div>
                ) : (
                  flows.map((flow) => {
                    const isSelected = selectedFlow?._id === flow._id;
                    return (
                      <div
                        key={flow._id}
                        onClick={() => handleSelectFlow(flow)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                          ? 'bg-emerald-50 border-emerald-600 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 truncate">{flow.name}</p>
                          <span className={`shrink-0 w-2 h-2 rounded-full ${flow.isActive ? 'bg-emerald-600' : 'bg-slate-300'}`} title={flow.isActive ? 'Active' : 'Inactive'} />
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                            !{flow.triggerKeyword || 'any'}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                            <Layers className="w-3 h-3" />{flow.nodes?.length || 0} nodes
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── Main Canvas ── */}
          <div className="lg:col-span-6">
            {editedFlow ? (
              <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                {/* Canvas Top Bar */}
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold text-slate-900 truncate max-w-[180px]">{editedFlow.name}</span>
                    {isDirty && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                        ● Unsaved
                      </span>
                    )}
                    {saveOk && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                        ✓ Saved
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isDirty && (
                      <button onClick={handleCancel}
                        className="px-3 py-1.5 text-xs rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold transition-colors">
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={saving || !isDirty}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl font-bold transition-all ${
                        isDirty ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {saving ? 'Saving...' : 'Save Flow'}
                    </button>
                  </div>
                </div>

                {saveError && (
                  <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{saveError}
                  </div>
                )}

                {/* Nodes Canvas */}
                <div className="p-4 space-y-0.5 min-h-[400px] max-h-[70vh] overflow-y-auto bg-slate-50/50">
                  {editedFlow.nodes.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <Bot className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-500" />
                      No nodes yet. Add your first node below.
                    </div>
                  ) : (
                    editedFlow.nodes.map((node, i) => (
                      <NodeCard
                        key={node.id}
                        node={node}
                        index={i}
                        total={editedFlow.nodes.length}
                        onEdit={handleOpenInspector}
                        onDelete={handleDeleteNode}
                        onDuplicate={handleDuplicate}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                      />
                    ))
                  )}

                  {/* Add Node */}
                  <div className="pt-2">
                    <AddNodePalette onAdd={handleAddNode} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white border border-slate-200 flex items-center justify-center min-h-[400px] shadow-xs">
                <div className="text-center text-slate-500">
                  <Bot className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-bold text-slate-800">Select a flow from the sidebar</p>
                  <p className="text-xs mt-1 text-slate-500">or create a new one to start building</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Panel — Flow Settings ── */}
          <div className="lg:col-span-3 space-y-3">
            {editedFlow ? (
              <>
                {/* Flow Settings */}
                <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Flow Settings</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <label className={label}>Flow Name</label>
                      <input value={editedFlow.name || ''} onChange={(e) => setFlowName(e.target.value)} className={inp} />
                    </div>
                    <div>
                      <label className={label}>Trigger Keyword</label>
                      <input
                        value={editedFlow.triggerKeyword || ''}
                        onChange={(e) => setFlowTrigger(e.target.value)}
                        placeholder="e.g. start, help, order"
                        className={inp}
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Customer sends this word to trigger the flow.</p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-700 font-bold">Active</span>
                      <button
                        onClick={() => setFlowActive(!editedFlow.isActive)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${editedFlow.isActive ? 'bg-emerald-600' : 'bg-slate-300'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${editedFlow.isActive ? 'translate-x-[18px]' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Flow Stats */}
                <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2 shadow-xs">
                  <span className={sectionLabel}>Flow Info</span>
                  <div className="space-y-1.5">
                    {[
                      ['Nodes', editedFlow.nodes.length],
                      ['Executions', selectedFlow?.executionCount || 0],
                      ['Status', editedFlow.isActive ? '🟢 Active' : '⚫ Inactive'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">{k}</span>
                        <span className="text-slate-900 font-mono font-bold">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 shadow-xs">
                  <span className={sectionLabel + ' text-rose-700'}>Danger Zone</span>
                  <button
                    onClick={() => handleDeleteFlow(editedFlow._id)}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-colors shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete This Flow
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-slate-500 text-xs shadow-xs font-medium">
                No flow selected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Create Flow Modal ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={(e) => e.target === e.currentTarget && setIsCreateOpen(false)}>
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-600" /> Create New Bot Flow
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFlow} className="p-5 space-y-4">
              <div>
                <label className={label}>Flow Name *</label>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Customer Onboarding Assistant"
                  className={inp}
                />
              </div>
              <div>
                <label className={label}>Trigger Keyword</label>
                <input
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  placeholder="start, help, order..."
                  className={inp}
                />
                <p className="text-[10px] text-slate-500 mt-1">Customer sends this to trigger the flow on WhatsApp.</p>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button type="button" onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 text-sm rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-all disabled:opacity-50 flex items-center gap-2">
                  {submitting ? 'Creating...' : <><Plus className="w-4 h-4" /> Initialize Flow</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Node Inspector Modal ── */}
      {inspecting && (
        <NodeInspector
          node={inspecting}
          allNodeIds={allNodeIds}
          onClose={() => setInspecting(null)}
          onSave={handleInspectorSave}
        />
      )}
    </DashboardLayout>
  );
}
