import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import api from '@/services/api';
import { Users, UserPlus, Upload, Download, Search, Trash2, Tag, Mail, Phone, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ContactsManager() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  // Add Contact Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tagsStr, setTagsStr] = useState('VIP, Lead');
  const [groupsStr, setGroupsStr] = useState('Customers');
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState('');

  // CSV Import State
  const [csvRaw, setCsvRaw] = useState(`[
  { "name": "John Doe", "phone": "15551234567", "email": "john@example.com", "tags": "VIP", "groups": "Leads" },
  { "name": "Alice Smith", "phone": "15559876543", "email": "alice@example.com", "tags": "Support", "groups": "Clients" }
]`);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/contacts?search=${search}`);
      if (res.success && res.data) {
        setContacts(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [search]);

  const handleCreateContact = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAddError('');

    try {
      const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
      const groups = groupsStr.split(',').map((g) => g.trim()).filter(Boolean);

      const res = await api.post('/contacts', { name, phone, email, tags, groups });
      if (res.success) {
        setIsAddOpen(false);
        setName('');
        setPhone('');
        setEmail('');
        fetchContacts();
      }
    } catch (err) {
      setAddError(err.message || 'Failed to create contact');
    } finally {
      setSubmitting(false);
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
    if (!confirm('Delete contact?')) return;
    try {
      const res = await api.delete(`/contacts/${id}`);
      if (res.success) fetchContacts();
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
              <Users className="w-6 h-6 text-emerald-400" /> WhatsApp Contacts Directory
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage customer contacts, import/export CSV datasets, and tag audiences for broadcasts.
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

        {importSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {importSuccess}
          </div>
        )}

        {/* Search Bar */}
        <Card>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contacts by name, phone number, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
            />
          </div>
        </Card>

        {/* Contacts Table */}
        <Card title={`Contacts Roster (${contacts.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Tags & Groups</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {contacts.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">
                      {c.name}
                      {c.email && <p className="text-xs font-normal text-slate-400">{c.email}</p>}
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{c.phone}</td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags || []).map((t, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                            {t}
                          </span>
                        ))}
                        {(c.groups || []).map((g, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                            {g}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {c.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteContact(c._id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Add Contact Modal */}
        <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New WhatsApp Contact">
          {addError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {addError}
            </div>
          )}

          <form onSubmit={handleCreateContact} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marcus Vance"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Phone Number (with Country Code) *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="15551234567"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marcus@example.com"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="VIP, Lead"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Groups (comma separated)
              </label>
              <input
                type="text"
                value={groupsStr}
                onChange={(e) => setGroupsStr(e.target.value)}
                placeholder="Customers, North America"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Save Contact
              </Button>
            </div>
          </form>
        </Modal>

        {/* Import CSV Modal */}
        <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title="Import Contacts CSV Dataset">
          <form onSubmit={handleImportCSV} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Paste JSON Array of Contacts
              </label>
              <textarea
                rows={8}
                value={csvRaw}
                onChange={(e) => setCsvRaw(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-400 focus:outline-none"
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
