import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import api from '@/services/api';
import {
  Users,
  UserPlus,
  Upload,
  Download,
  Search,
  Trash2,
  Tag,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Filter,
  UserCheck,
  Building,
  MapPin,
  Clock,
  Star,
  Activity,
  ChevronRight,
  Archive,
  MoreVertical,
  CheckSquare,
  Square,
  MessageCircle,
} from 'lucide-react';

export default function ContactsManager() {
  const [contacts, setContacts] = useState([]);
  const [summary, setSummary] = useState({ totalContacts: 0, activeContacts: 0, vipCount: 0, newToday: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected for Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkActionType, setBulkActionType] = useState('add_tag');
  const [bulkTagVal, setBulkTagVal] = useState('VIP');

  // Contact Inspector Drawer State
  const [inspectorContact, setInspectorContact] = useState(null);
  const [timeline, setTimeline] = useState([]);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Add Contact Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [tagsStr, setTagsStr] = useState('VIP, Lead');
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState('');

  // CSV Import State
  const [csvRaw, setCsvRaw] = useState(`[
  { "name": "John Doe", "phone": "15551234567", "email": "john@example.com", "companyName": "Acme Inc", "city": "New York", "tags": ["VIP"] },
  { "name": "Alice Smith", "phone": "15559876543", "email": "alice@example.com", "companyName": "TechCorp", "city": "San Francisco", "tags": ["Lead"] }
]`);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/contacts?search=${search}&tag=${tagFilter}&status=${statusFilter}`);
      if (res.success && res.data) {
        setContacts(res.data.contacts || res.data);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [search, tagFilter, statusFilter]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(contacts.map((c) => c._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleExecuteBulkAction = async () => {
    if (selectedIds.length === 0) return alert('Select contacts first');
    try {
      const res = await api.post('/contacts/bulk', {
        contactIds: selectedIds,
        action: bulkActionType,
        tag: bulkTagVal,
      });
      if (res.success) {
        alert(res.message);
        setSelectedIds([]);
        fetchContacts();
      }
    } catch (err) {
      alert(err.message || 'Bulk action failed');
    }
  };

  const handleCreateContact = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAddError('');

    try {
      const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
      const res = await api.post('/contacts', { name, phone, email, companyName, city, tags });
      if (res.success) {
        setIsAddOpen(false);
        setName('');
        setPhone('');
        setEmail('');
        setCompanyName('');
        setCity('');
        fetchContacts();
      }
    } catch (err) {
      setAddError(err.message || 'Failed to create contact');
    } finally {
      setSubmitting(false);
    }
  };

  const openInspector = async (c) => {
    setInspectorContact(c);
    try {
      const res = await api.get(`/contacts/${c._id}`);
      if (res.success && res.data) {
        setTimeline(res.data.timeline || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportCSV = async (e) => {
    e.preventDefault();
    setImporting(true);
    setImportSuccess('');

    try {
      const parsedContacts = JSON.parse(csvRaw);
      const res = await api.post('/contacts/import', { contacts: parsedContacts });
      if (res.success) {
        setImportSuccess(res.message);
        setIsImportOpen(false);
        fetchContacts();
      }
    } catch (err) {
      alert(err.message || 'Failed to parse JSON/CSV data');
    } finally {
      setImporting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      window.open('/api/contacts/export', '_blank');
    } catch (err) {
      alert('Export failed');
    }
  };

  const handleDeleteContact = async (id) => {
    if (!confirm('Delete contact profile?')) return;
    try {
      const res = await api.delete(`/contacts/${id}`);
      if (res.success) fetchContacts();
    } catch (err) {
      alert(err.message);
    }
  };

  const getTagBadge = (tag) => {
    const colorMap = {
      VIP: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      Lead: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      Customer: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      Support: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      Complaint: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      'Hot Lead': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      'Cold Lead': 'bg-slate-700 text-slate-300 border-slate-600',
    };

    return (
      <span
        key={tag}
        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${
          colorMap[tag] || 'bg-slate-800 text-slate-300 border-slate-700'
        }`}
      >
        {tag}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* CRM Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-400" /> Enterprise WhatsApp CRM Directory
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage multi-channel customer profiles, custom tags, timelines, and bulk audience segmentation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" icon={Upload} onClick={() => setIsImportOpen(true)}>
              Import CSV
            </Button>
            <Button variant="secondary" icon={Download} onClick={handleExportCSV}>
              Export CSV
            </Button>
            <Button icon={UserPlus} onClick={() => setIsAddOpen(true)}>
              Add Contact
            </Button>
          </div>
        </div>

        {/* CRM Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Contacts</p>
              <h3 className="text-lg font-bold text-white">{summary.totalContacts}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Active Accounts</p>
              <h3 className="text-lg font-bold text-white">{summary.activeContacts}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">VIP Customers</p>
              <h3 className="text-lg font-bold text-white">{summary.vipCount}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">New Today</p>
              <h3 className="text-lg font-bold text-white">{summary.newToday}</h3>
            </div>
          </Card>
        </div>

        {importSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {importSuccess}
          </div>
        )}

        {/* Search & Filter Bar */}
        <Card>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, phone, email, company, or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="all">All Tags</option>
                <option value="VIP">VIP</option>
                <option value="Lead">Lead</option>
                <option value="Customer">Customer</option>
                <option value="Support">Support</option>
                <option value="Complaint">Complaint</option>
                <option value="Hot Lead">Hot Lead</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Bulk Action Controls */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs text-emerald-300">
            <span className="font-bold">{selectedIds.length} Contacts Selected for Bulk Action</span>
            <div className="flex items-center gap-2">
              <select
                value={bulkActionType}
                onChange={(e) => setBulkActionType(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2 py-1"
              >
                <option value="add_tag">Add Tag</option>
                <option value="remove_tag">Remove Tag</option>
                <option value="archive">Archive</option>
                <option value="delete">Delete</option>
              </select>

              {(bulkActionType === 'add_tag' || bulkActionType === 'remove_tag') && (
                <input
                  type="text"
                  value={bulkTagVal}
                  onChange={(e) => setBulkTagVal(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2 py-1 w-24"
                />
              )}

              <Button size="sm" onClick={handleExecuteBulkAction}>
                Apply Bulk Action
              </Button>
            </div>
          </div>
        )}

        {/* Main Contacts Roster Table */}
        <div className="flex gap-4">
          <Card title={`CRM Roster (${contacts.length})`} className="flex-1 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-3 w-8">
                      <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === contacts.length && contacts.length > 0} />
                    </th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Phone / WA</th>
                    <th className="px-4 py-3">Company & City</th>
                    <th className="px-4 py-3">Tags</th>
                    <th className="px-4 py-3">Lead Score</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {contacts.map((c) => {
                    const isSelected = selectedIds.includes(c._id);
                    return (
                      <tr key={c._id} className={`hover:bg-slate-850/50 transition-colors ${isSelected ? 'bg-emerald-500/5' : ''}`}>
                        <td className="px-3 py-3">
                          <input type="checkbox" checked={isSelected} onChange={() => handleSelectOne(c._id)} />
                        </td>

                        <td className="px-4 py-3 cursor-pointer" onClick={() => openInspector(c)}>
                          <div className="font-semibold text-white flex items-center gap-2">
                            {c.name}
                          </div>
                          {c.email && <p className="text-[10px] text-slate-400 font-normal">{c.email}</p>}
                        </td>

                        <td className="px-4 py-3 font-mono text-slate-300">{c.phone}</td>

                        <td className="px-4 py-3 text-slate-400">
                          {c.companyName || '-'}
                          {c.city && <span className="block text-[10px] text-slate-500">{c.city}</span>}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">{(c.tags || []).map((t) => getTagBadge(t))}</div>
                        </td>

                        <td className="px-4 py-3 font-mono text-emerald-400 font-bold">{c.leadScore || 50} pts</td>

                        <td className="px-4 py-3 text-right space-x-1">
                          <button onClick={() => openInspector(c)} className="p-1.5 text-slate-400 hover:text-emerald-400">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteContact(c._id)} className="p-1.5 text-slate-500 hover:text-rose-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Contact Inspector Drawer (Right Panel) */}
          {inspectorContact && (
            <Card className="w-80 flex-shrink-0 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" /> Customer Inspector
                </h3>
                <button onClick={() => setInspectorContact(null)} className="text-slate-500 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <p className="font-bold text-white text-sm">{inspectorContact.name}</p>
                  <p className="text-slate-400 font-mono">{inspectorContact.phone}</p>
                  {inspectorContact.email && <p className="text-slate-400">{inspectorContact.email}</p>}
                </div>

                <div className="flex flex-wrap gap-1">{inspectorContact.tags?.map((t) => getTagBadge(t))}</div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-[11px] text-slate-400">
                  <p className="flex justify-between">
                    <span>Company:</span> <strong className="text-slate-200">{inspectorContact.companyName || '-'}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>City:</span> <strong className="text-slate-200">{inspectorContact.city || '-'}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Lead Score:</span> <strong className="text-emerald-400">{inspectorContact.leadScore || 50} pts</strong>
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-white mb-2 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" /> Activity Timeline
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
                    {timeline.length > 0 ? (
                      timeline.map((item, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px]">
                          <p className="font-bold text-emerald-400">{item.title}</p>
                          <p className="text-slate-300 truncate">{item.description}</p>
                          <p className="text-slate-500 font-mono text-right mt-1">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-500">No activity recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Add Contact Modal */}
        <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New Enterprise Contact">
          {addError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {addError}
            </div>
          )}

          <form onSubmit={handleCreateContact} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marcus Vance"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Phone Number (with Country Code) *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="15551234567"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="marcus@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Company</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="San Francisco"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tagsStr}
                  onChange={(e) => setTagsStr(e.target.value)}
                  placeholder="VIP, Lead"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Save Contact Profile
              </Button>
            </div>
          </form>
        </Modal>

        {/* Import CSV Modal */}
        <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title="Import Contacts Dataset">
          <form onSubmit={handleImportCSV} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Paste JSON / CSV Array of Contacts</label>
              <textarea
                rows={8}
                value={csvRaw}
                onChange={(e) => setCsvRaw(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-emerald-400 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setIsImportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={importing}>
                Import Dataset
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
