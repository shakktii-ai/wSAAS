import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import api from '@/services/api';
import { CreditCard, Check, ShieldCheck, Download, Zap, CheckCircle2 } from 'lucide-react';

export default function BillingManager() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchBilling = async () => {
    try {
      setLoading(true);
      const res = await api.get('/billing');
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const handleUpgrade = async (plan) => {
    setUpgrading(true);
    setMessage('');
    try {
      const res = await api.post('/billing', { plan });
      if (res.success) {
        setMessage(`Plan upgraded to ${plan}!`);
        fetchBilling();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setUpgrading(false);
    }
  };

  const currentPlan = data?.subscription?.plan || 'PRO';

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" /> Billing & Subscription Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your SaaS plan, monthly message quotas, and invoice payment history.
          </p>
        </div>

        {message && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {message}
          </div>
        )}

        {/* Quota Progress Card */}
        <Card title="Current Usage Quota" subtitle="Monthly message allowance">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-white">Messages Used This Month</span>
              <span className="text-emerald-400 font-bold">
                {(data?.subscription?.usedMessagesThisMonth || 0).toLocaleString()} / {(data?.subscription?.monthlyMessageLimit || 50000).toLocaleString()}
              </span>
            </div>
            <div className="h-3 bg-slate-950 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    ((data?.subscription?.usedMessagesThisMonth || 0) /
                      (data?.subscription?.monthlyMessageLimit || 50000)) *
                      100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        </Card>

        {/* Pricing Plans Grid */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">SyncChat SaaS Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* FREE */}
            <Card className={currentPlan === 'FREE' ? 'border-emerald-500' : ''}>
              <h3 className="text-lg font-bold text-white">Starter</h3>
              <p className="text-2xl font-extrabold text-white mt-2">$0 <span className="text-xs font-normal text-slate-400">/mo</span></p>
              <ul className="text-xs text-slate-300 space-y-2 my-4">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 1,000 Messages/mo</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 1 Agent Account</li>
              </ul>
              <Button
                variant={currentPlan === 'FREE' ? 'outline' : 'secondary'}
                disabled={currentPlan === 'FREE'}
                onClick={() => handleUpgrade('FREE')}
                className="w-full"
              >
                {currentPlan === 'FREE' ? 'Active Plan' : 'Downgrade'}
              </Button>
            </Card>

            {/* PRO */}
            <Card className={`relative ${currentPlan === 'PRO' ? 'border-emerald-500 shadow-emerald-500/10' : ''}`}>
              <span className="absolute top-4 right-4 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Popular
              </span>
              <h3 className="text-lg font-bold text-white">Professional</h3>
              <p className="text-2xl font-extrabold text-white mt-2">$49 <span className="text-xs font-normal text-slate-400">/mo</span></p>
              <ul className="text-xs text-slate-300 space-y-2 my-4">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 50,000 Messages/mo</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Shared Inbox & Bot Builder</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> AI Auto-Reply Studio</li>
              </ul>
              <Button
                variant={currentPlan === 'PRO' ? 'outline' : 'primary'}
                disabled={currentPlan === 'PRO'}
                onClick={() => handleUpgrade('PRO')}
                className="w-full"
              >
                {currentPlan === 'PRO' ? 'Active Plan' : 'Upgrade to Pro'}
              </Button>
            </Card>

            {/* ENTERPRISE */}
            <Card className={currentPlan === 'ENTERPRISE' ? 'border-emerald-500' : ''}>
              <h3 className="text-lg font-bold text-white">Enterprise</h3>
              <p className="text-2xl font-extrabold text-white mt-2">$199 <span className="text-xs font-normal text-slate-400">/mo</span></p>
              <ul className="text-xs text-slate-300 space-y-2 my-4">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 500,000 Messages/mo</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Dedicated Meta WABA SLA</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Unlimited Team Accounts</li>
              </ul>
              <Button
                variant={currentPlan === 'ENTERPRISE' ? 'outline' : 'secondary'}
                disabled={currentPlan === 'ENTERPRISE'}
                onClick={() => handleUpgrade('ENTERPRISE')}
                className="w-full"
              >
                {currentPlan === 'ENTERPRISE' ? 'Active Plan' : 'Upgrade Enterprise'}
              </Button>
            </Card>
          </div>
        </div>

        {/* Invoice History */}
        <Card title="Invoice & Payment History">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {(data?.invoices || []).map((inv) => (
                  <tr key={inv._id}>
                    <td className="px-4 py-3 font-mono font-semibold text-white">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3">{new Date(inv.paidAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono text-emerald-400">${inv.amount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {inv.status}
                      </span>
                    </td>
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
