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

  // CSV Import & Template Mappings State
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [importMode, setImportMode] = useState('file'); // 'file' | 'raw'
  const [parsedContacts, setParsedContacts] = useState([]);
  const [detectedHeaders, setDetectedHeaders] = useState([]);
  const [uploadFileName, setUploadFileName] = useState('');
  const [csvRaw, setCsvRaw] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');

  // Fetch approved templates for CSV Sample Generation
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await api.get('/templates?status=APPROVED');
        if (res.success && res.data) {
          setTemplates(res.data.templates || res.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch templates for import:', err);
      }
    };
    fetchTemplates();
  }, []);

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

  // Parse CSV text into array of contact objects
  const parseCSVToObjects = (csvText) => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return { objects: [], headers: [] };

    const splitRow = (rowStr) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < rowStr.length; i++) {
        const char = rowStr[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const headers = splitRow(lines[0]).map(h => h.trim());
    const objects = [];

    for (let i = 1; i < lines.length; i++) {
      const values = splitRow(lines[i]);
      if (values.length === 0 || !values[0]) continue;
      const obj = {};
      headers.forEach((header, colIdx) => {
        if (header) {
          let val = values[colIdx] || '';
          const lowerH = header.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (lowerH === 'name' || lowerH === 'fullname' || lowerH === 'contactname') {
            obj.name = val;
          } else if (lowerH === 'phone' || lowerH === 'mobile' || lowerH === 'phonenumber' || lowerH === 'waid') {
            obj.phone = val;
          } else if (lowerH === 'email' || lowerH === 'emailaddress') {
            obj.email = val;
          } else if (lowerH === 'company' || lowerH === 'companyname') {
            obj.companyName = val;
          } else if (lowerH === 'city') {
            obj.city = val;
          } else if (lowerH === 'tags' || lowerH === 'tag') {
            obj.tags = val ? val.split(';').map(t => t.trim()).filter(Boolean) : ['Lead'];
          } else {
            // Custom contact field (e.g. serviceRequestId, category, pincode, address, details)
            obj[header] = val;
          }
        }
      });

      if (obj.name && obj.phone) {
        objects.push(obj);
      }
    }

    return { objects, headers };
  };

  // Generate Sample CSV based on selected Meta Template parameters
  const handleDownloadSampleCSV = () => {
    const selectedTpl = templates.find(t => t._id === selectedTemplateId || t.name === selectedTemplateId);
    
    let standardHeaders = ['Name', 'Phone', 'Email', 'Company', 'City', 'Tags'];
    let sampleRow1 = ['Omkar', '919876543210', 'omkar@example.com', 'Acme Services', 'Pune', 'VIP;Lead'];
    let sampleRow2 = ['Alex Smith', '919876543211', 'alex@example.com', 'TechCorp', 'Mumbai', 'Lead'];

    if (selectedTpl) {
      const bodyText = selectedTpl.bodyText || (Array.isArray(selectedTpl.components) ? selectedTpl.components.find(c => (c.type || '').toUpperCase() === 'BODY')?.text : '') || '';
      const matches = Array.from(bodyText.matchAll(/\{\{(\d+)\}\}/g));
      const indices = Array.from(new Set(matches.map(m => parseInt(m[1], 10)))).sort((a, b) => a - b);

      if (indices.length > 0) {
        const extraHeaders = [];
        const extraVals1 = [];
        const extraVals2 = [];

        indices.forEach(idx => {
          const regex = new RegExp(`(?:\\d+\\.\\s*)?([^\\n{}:]+)[:\\s=]*\\{\\{${idx}\\}\\}`, 'i');
          const match = bodyText.match(regex);
          let label = match && match[1] ? match[1].trim().replace(/^[\d.\s\-\*]+/, '').trim() : `Param_${idx}`;
          const lowerL = label.toLowerCase();

          let keyName = label.replace(/[^a-zA-Z0-9]/g, '');
          if (!keyName) keyName = `param${idx}`;

          if (lowerL.includes('ticket') || lowerL.includes('request') || lowerL.includes('id')) {
            keyName = 'serviceRequestId';
            extraHeaders.push(keyName);
            extraVals1.push('TKT001');
            extraVals2.push('TKT002');
          } else if (lowerL.includes('tech') || lowerL.includes('vendor') || lowerL.includes('assign')) {
            keyName = 'technicianName';
            extraHeaders.push(keyName);
            extraVals1.push('Rahul Sharma');
            extraVals2.push('Priya Verma');
          } else if (lowerL.includes('date') || lowerL.includes('time')) {
            keyName = 'serviceDate';
            extraHeaders.push(keyName);
            extraVals1.push('21 Aug 2026');
            extraVals2.push('22 Aug 2026');
          } else if (lowerL.includes('status')) {
            keyName = 'status';
            extraHeaders.push(keyName);
            extraVals1.push('Pending');
            extraVals2.push('In Progress');
          } else if (lowerL.includes('cat') || lowerL.includes('type')) {
            keyName = 'category';
            extraHeaders.push(keyName);
            extraVals1.push('Electrician');
            extraVals2.push('Plumber');
          } else if (lowerL.includes('code') || lowerL.includes('pin')) {
            keyName = 'pincode';
            extraHeaders.push(keyName);
            extraVals1.push('411041');
            extraVals2.push('411045');
          } else if (lowerL.includes('addr')) {
            keyName = 'address';
            extraHeaders.push(keyName);
            extraVals1.push('Baner, Pune');
            extraVals2.push('Wakad, Pune');
          } else if (lowerL.includes('detail') || lowerL.includes('desc')) {
            keyName = 'details';
            extraHeaders.push(keyName);
            extraVals1.push('Water leakage in kitchen');
            extraVals2.push('Bathroom pipe blockage');
          } else {
            extraHeaders.push(keyName);
            extraVals1.push(`Sample_${idx}`);
            extraVals2.push(`Sample_${idx}`);
          }
        });

        standardHeaders.splice(4, 0, ...extraHeaders);
        sampleRow1.splice(4, 0, ...extraVals1);
        sampleRow2.splice(4, 0, ...extraVals2);
      }
    }

    const csvContent = [
      standardHeaders.map(h => `"${h}"`).join(','),
      sampleRow1.map(v => `"${v}"`).join(','),
      sampleRow2.map(v => `"${v}"`).join(','),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const tplSlug = selectedTpl ? selectedTpl.name : 'standard';
    link.setAttribute('download', `sample_contacts_${tplSlug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvRaw(text);
      const { objects, headers } = parseCSVToObjects(text);
      setParsedContacts(objects);
      setDetectedHeaders(headers);
    };
    reader.readAsText(file);
  };

  const handleImportCSV = async (e) => {
    e.preventDefault();
    setImporting(true);
    setImportSuccess('');

    try {
      let contactsToSubmit = parsedContacts;

      if (importMode === 'raw' || contactsToSubmit.length === 0) {
        if (csvRaw.trim().startsWith('[')) {
          contactsToSubmit = JSON.parse(csvRaw);
        } else {
          const { objects } = parseCSVToObjects(csvRaw);
          contactsToSubmit = objects;
        }
      }

      if (!contactsToSubmit || contactsToSubmit.length === 0) {
        alert('No valid contact records found to import. Please check file format.');
        setImporting(false);
        return;
      }

      const res = await api.post('/contacts/import', { contacts: contactsToSubmit });
      if (res.success) {
        setImportSuccess(res.message);
        setIsImportOpen(false);
        setParsedContacts([]);
        setUploadFileName('');
        fetchContacts();
      }
    } catch (err) {
      alert(err.message || 'Failed to import contacts dataset');
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
      VIP: 'bg-amber-100 text-amber-800 border-amber-200',
      Lead: 'bg-blue-100 text-blue-800 border-blue-200',
      Customer: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      Support: 'bg-sky-100 text-sky-800 border-sky-200',
      Complaint: 'bg-rose-100 text-rose-800 border-rose-200',
      'Hot Lead': 'bg-rose-100 text-rose-800 border-rose-200',
      'Cold Lead': 'bg-slate-100 text-slate-700 border-slate-200',
    };

    return (
      <span
        key={tag}
        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${
          colorMap[tag] || 'bg-slate-100 text-slate-700 border-slate-200'
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
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-600" /> Enterprise WhatsApp CRM Directory
            </h1>
            <p className="text-xs text-slate-600 mt-1">
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
          <Card className="flex items-center gap-3 shadow-xs">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Contacts</p>
              <h3 className="text-lg font-bold text-slate-900">{summary.totalContacts}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3 shadow-xs">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Active Accounts</p>
              <h3 className="text-lg font-bold text-slate-900">{summary.activeContacts}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3 shadow-xs">
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">VIP Customers</p>
              <h3 className="text-lg font-bold text-slate-900">{summary.vipCount}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3 shadow-xs">
            <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">New Today</p>
              <h3 className="text-lg font-bold text-slate-900">{summary.newToday}</h3>
            </div>
          </Card>
        </div>

        {importSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {importSuccess}
          </div>
        )}

        {/* Search & Filter Bar */}
        <Card className="shadow-xs">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, phone, email, company, or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600 font-medium"
              >
                <option value="all">All Tags</option>
                <option value="VIP">VIP</option>
                <option value="Lead">Lead</option>
                <option value="Customer">Customer</option>
                <option value="Support">Support</option>
                <option value="Complaint">Complaint</option>
                <option value="Hot Lead">Hot Lead</option>
                <option value="Cold Lead">Cold Lead</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600 font-medium"
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
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 font-bold shadow-xs">
            <span>{selectedIds.length} Contacts Selected for Bulk Action</span>
            <div className="flex items-center gap-2">
              <select
                value={bulkActionType}
                onChange={(e) => setBulkActionType(e.target.value)}
                className="bg-white border border-slate-200 text-slate-900 rounded-lg px-2 py-1 focus:outline-none"
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
                  className="bg-white border border-slate-200 text-slate-900 rounded-lg px-2 py-1 w-24 focus:outline-none"
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
          <Card title={`CRM Roster (${contacts.length})`} className="flex-1 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
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
                <tbody className="divide-y divide-slate-100 font-medium">
                  {contacts.map((c) => {
                    const isSelected = selectedIds.includes(c._id);
                    return (
                      <tr key={c._id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-emerald-50' : ''}`}>
                        <td className="px-3 py-3">
                          <input type="checkbox" checked={isSelected} onChange={() => handleSelectOne(c._id)} />
                        </td>

                        <td className="px-4 py-3 cursor-pointer" onClick={() => openInspector(c)}>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            {c.name}
                          </div>
                          {c.email && <p className="text-[10px] text-slate-500 font-normal">{c.email}</p>}
                        </td>

                        <td className="px-4 py-3 font-mono text-slate-700">{c.phone}</td>

                        <td className="px-4 py-3 text-slate-600">
                          {c.companyName || '-'}
                          {c.city && <span className="block text-[10px] text-slate-500">{c.city}</span>}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">{(c.tags || []).map((t) => getTagBadge(t))}</div>
                        </td>

                        <td className="px-4 py-3 font-mono text-emerald-700 font-bold">{c.leadScore || 50} pts</td>

                        <td className="px-4 py-3 text-right space-x-1">
                          <button onClick={() => openInspector(c)} className="p-1.5 text-slate-400 hover:text-emerald-600">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteContact(c._id)} className="p-1.5 text-slate-400 hover:text-rose-600">
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
        <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title="Import Contacts Dataset" maxWidth="max-w-2xl">
          <form onSubmit={handleImportCSV} className="space-y-4 text-xs">

            {/* Template Selection for Demo CSV */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Select WhatsApp Template for Demo CSV (Optional)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-600"
                >
                  <option value="">Standard Contacts Template (Default)</option>
                  {templates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  icon={Download}
                  onClick={handleDownloadSampleCSV}
                  className="shrink-0 text-xs font-bold text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                >
                  Download Sample CSV
                </Button>
              </div>
              <p className="text-[10px] text-slate-500">
                💡 The downloaded sample CSV automatically includes column headers matching your template parameters (e.g. serviceRequestId, category, pincode, address, details).
              </p>
            </div>

            {/* Import Mode Toggle */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setImportMode('file')}
                className={`flex-1 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  importMode === 'file'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                📁 Upload CSV File
              </button>
              <button
                type="button"
                onClick={() => setImportMode('raw')}
                className={`flex-1 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  importMode === 'raw'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                📝 Paste Raw CSV / JSON Text
              </button>
            </div>

            {/* File Upload Mode */}
            {importMode === 'file' ? (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">
                    {uploadFileName ? `Uploaded: ${uploadFileName}` : 'Click or Drag & Drop CSV file here'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Supports .csv files with custom fields
                  </p>
                </div>

                {parsedContacts.length > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      {parsedContacts.length} Contacts Parsed & Ready for Import
                    </p>
                    <p className="text-[10px] font-mono text-emerald-700 truncate">
                      Detected Columns: {detectedHeaders.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-slate-700 font-bold mb-1">Paste CSV or JSON Array</label>
                <textarea
                  rows={6}
                  value={csvRaw}
                  onChange={(e) => setCsvRaw(e.target.value)}
                  placeholder={`Name,Phone,Email,Company,serviceRequestId,category,pincode,address,details,Tags\nOmkar,919876543210,omkar@example.com,Acme,TKT001,Electrician,411041,"Baner, Pune","Water leakage in kitchen",VIP;Lead`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-slate-900 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsImportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={importing} icon={Upload}>
                {parsedContacts.length > 0 ? `Import ${parsedContacts.length} Contacts` : 'Import Contacts Dataset'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
