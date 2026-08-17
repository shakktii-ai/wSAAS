import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  UserPlus,
  User,
  ShieldCheck,
  Mail,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Activity,
  MessageCircle,
  Clock,
  Award,
  Zap,
  Circle,
  Building,
} from 'lucide-react';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ totalAgents: 0, onlineAgents: 0, busyAgents: 0 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [myPresence, setMyPresence] = useState('online');

  // Add User Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('AGENT');
  const [department, setDepartment] = useState('Customer Support');
  const [designation, setDesignation] = useState('Support Agent');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      if (res.success && res.data) {
        const agentList = res.data.agents || res.data;
        setUsers(agentList);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdatePresence = async (newPresence) => {
    setMyPresence(newPresence);
    try {
      const res = await api.post('/users/presence', { presence: newPresence });
      if (res.success) {
        fetchUsers();
      }
    } catch (err) {
      alert(err.message || 'Failed to update presence');
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');

    try {
      const res = await api.post('/users', { name, email, password, role, department, designation });
      if (res.success) {
        setIsModalOpen(false);
        setName('');
        setEmail('');
        setPassword('');
        setRole('AGENT');
        fetchUsers();
      }
    } catch (err) {
      setModalError(err.message || 'Failed to add user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Are you sure you want to remove this user from the workspace?')) return;
    try {
      const res = await api.delete(`/users/${id}`);
      if (res.success) {
        fetchUsers();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const getPresenceBadge = (presence) => {
    const badges = {
      online: { color: 'bg-emerald-500', text: 'Online' },
      away: { color: 'bg-amber-500', text: 'Away' },
      busy: { color: 'bg-rose-500', text: 'Busy' },
      offline: { color: 'bg-slate-500', text: 'Offline' },
    };
    const b = badges[presence] || badges.offline;

    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-300">
        <span className={`w-2 h-2 rounded-full ${b.color} animate-pulse`} />
        {b.text}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Workspace & Presence Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" /> Multi-Agent Team Workspace & SLA
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage agent assignments, track response SLAs, and monitor live presence status.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Presence Toggle */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
              <span className="text-xs text-slate-400">My Status:</span>
              <select
                value={myPresence}
                onChange={(e) => handleUpdatePresence(e.target.value)}
                className="bg-slate-950 text-emerald-400 font-bold text-xs rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value="online">🟢 Online</option>
                <option value="away">🟡 Away</option>
                <option value="busy">🔴 Busy</option>
                <option value="offline">⚪ Offline</option>
              </select>
            </div>

            <Button icon={UserPlus} onClick={() => setIsModalOpen(true)}>
              Invite Agent
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex items-center gap-3 shadow-sm">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Online Agents</p>
              <h3 className="text-lg font-bold text-slate-900">{summary.onlineAgents || users.length} Online</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3 shadow-sm">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Assigned Chats</p>
              <h3 className="text-lg font-bold text-slate-900">12 Active</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3 shadow-sm">
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Avg First Response</p>
              <h3 className="text-lg font-bold text-slate-900">1.8 min</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3 shadow-sm">
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Team SLA Score</p>
              <h3 className="text-lg font-bold text-slate-900">98.4%</h3>
            </div>
          </Card>
        </div>

        {/* Team Leaderboard Table */}
        <Card title={`Support Agents Leaderboard (${users.length})`} subtitle="Real-time response times & assignment metrics">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Presence</th>
                  <th className="px-4 py-3">Active Chats</th>
                  <th className="px-4 py-3">SLA Response</th>
                  <th className="px-4 py-3">Performance Score</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 border border-emerald-700 flex items-center justify-center font-bold text-white text-xs shadow-sm">
                        {u.name ? u.name[0].toUpperCase() : 'A'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{u.name}</p>
                        <p className="text-[10px] text-slate-500">{u.email}</p>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-600 font-medium">{u.department || 'Support'}</td>

                    <td className="px-4 py-3">{getPresenceBadge(u.presence || 'online')}</td>

                    <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                      {u.activeChatsCount || 0} Chats
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-700">
                      {Math.round((u.avgResponseTimeSeconds || 120) / 60)}m avg
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 font-mono">{u.performanceScore || 95}%</span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                          <div
                            className="bg-emerald-600 h-1.5 rounded-full"
                            style={{ width: `${u.performanceScore || 95}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      {u._id !== currentUser?._id && (
                        <button
                          onClick={() => handleDeleteUser(u._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Invite User Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Invite Agent to Workspace">
          {modalError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4" /> {modalError}
            </div>
          )}

          <form onSubmit={handleAddUser} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Jenkins"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@company.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Customer Support"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Senior Specialist"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Assign Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              >
                <option value="AGENT">AGENT (Shared Inbox & Customer Chat)</option>
                <option value="MANAGER">MANAGER (Campaigns & Bot builder)</option>
                <option value="COMPANY_ADMIN">COMPANY_ADMIN (Full workspace control)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Create Agent Account
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
