import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import api from '@/services/api';
import { ShieldCheck, Building2, Terminal, Key, CheckCircle2, Lock, AlertTriangle } from 'lucide-react';

export default function SuperAdminPortal() {
  const [companies, setCompanies] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [compRes, logRes] = await Promise.all([
        api.get('/superadmin/companies'),
        api.get('/superadmin/audit'),
      ]);
      if (compRes.success) setCompanies(compRes.data);
      if (logRes.success) setAuditLogs(logRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStatus = async (companyId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!confirm(`Change company status to ${newStatus}?`)) return;

    try {
      const res = await api.put('/superadmin/companies', {
        id: companyId,
        status: newStatus,
      });
      if (res.success) {
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" /> Super Admin Platform Control Center
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Global multi-tenant governance, company suspension, API keys, and security audit logs.
          </p>
        </div>

        {/* Multi-tenant Company Management */}
        <Card title={`Registered Company Tenants (${companies.length})`} className="shadow-xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-4 py-3">Company Workspace</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Users</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {companies.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{c.slug}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 font-bold uppercase rounded bg-purple-100 text-purple-800 border border-purple-200">
                        {c.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">{c.userCount || 1} Users</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 font-bold uppercase rounded-full border ${
                          c.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border-rose-200'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={c.status === 'active' ? 'danger' : 'outline'}
                        onClick={() => handleToggleStatus(c._id, c.status)}
                      >
                        {c.status === 'active' ? 'Suspend Tenant' : 'Activate Tenant'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Audit Log Stream */}
        <Card title={`System Audit Logs (${auditLogs.length})`} className="shadow-xs bg-white">
          <div className="overflow-x-auto max-h-[400px] scrollbar-thin">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Resource</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2 text-slate-900 font-bold">{log.userName}</td>
                    <td className="px-3 py-2 text-purple-700 font-bold">{log.action}</td>
                    <td className="px-3 py-2 text-slate-700">{log.resource}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
