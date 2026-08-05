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

        {/* Team Analytics Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Online Agents</p>
              <h3 className="text-lg font-bold text-white">{summary.onlineAgents} / {summary.totalAgents}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Active Support Chats</p>
              <h3 className="text-lg font-bold text-white">12 Active</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Avg First Response</p>
              <h3 className="text-lg font-bold text-white">1.8 min</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Team SLA Score</p>
              <h3 className="text-lg font-bold text-white">98.4%</h3>
            </div>
          </Card>
        </div>

        {/* Team Leaderboard Table */}
        <Card title={`Support Agents Leaderboard (${users.length})`} subtitle="Real-time response times & assignment metrics">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
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
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                        {u.name ? u.name[0].toUpperCase() : 'A'}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{u.name}</p>
                        <p className="text-[10px] text-slate-400">{u.email}</p>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-400">{u.department || 'Support'}</td>

                    <td className="px-4 py-3">{getPresenceBadge(u.presence || 'online')}</td>

                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                      {u.activeChatsCount || 0} Chats
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-300">
                      {Math.round((u.avgResponseTimeSeconds || 120) / 60)}m avg
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white font-mono">{u.performanceScore || 95}%</span>
                        <div className="w-16 bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${u.performanceScore || 95}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      {u._id !== currentUser?._id && (
                        <button
                          onClick={() => handleDeleteUser(u._id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
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
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {modalError}
            </div>
          )}

          <form onSubmit={handleAddUser} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Jenkins"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@company.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
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
