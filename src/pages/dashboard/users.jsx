import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { UserPlus, User, ShieldCheck, Mail, Trash2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Add User Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('AGENT');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      if (res.success && res.data) {
        setUsers(res.data);
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

  const handleAddUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');

    try {
      const res = await api.post('/users', { name, email, password, role });
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

  const getRoleBadge = (roleCode) => {
    const roles = {
      SUPER_ADMIN: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      COMPANY_ADMIN: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      MANAGER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      AGENT: 'bg-slate-700/50 text-slate-300 border-slate-600',
    };
    return (
      <span className={`px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase rounded-full border ${roles[roleCode] || roles.AGENT}`}>
        {roleCode}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" /> Team Users & RBAC
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage workspace access, assign roles, and control team member permissions.
            </p>
          </div>
          <Button icon={UserPlus} onClick={() => setIsModalOpen(true)}>
            Invite Team Member
          </Button>
        </div>

        <Card title={`Workspace Members (${users.length})`} subtitle="Isolated tenant user roster">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-4 py-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                        {u.name ? u.name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{u.name}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" /> {u.email}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">{getRoleBadge(u.role)}</td>

                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {u.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {u._id !== currentUser?._id && (
                        <button
                          onClick={() => handleDeleteUser(u._id)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Remove user"
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
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Invite Team Member">
          {modalError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {modalError}
            </div>
          )}

          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Jenkins"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@company.com"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Assign Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              >
                <option value="COMPANY_ADMIN">COMPANY_ADMIN (Full workspace control)</option>
                <option value="MANAGER">MANAGER (Campaigns, Bot builder, Inbox)</option>
                <option value="AGENT">AGENT (Shared Inbox & Customer Chat)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Create Member Account
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
