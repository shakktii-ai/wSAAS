import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import api from '@/services/api';
import { CreditCard, CheckCircle2, ShieldCheck, Info, MessageSquare, Zap, Globe } from 'lucide-react';

export default function BillingManager() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBilling = async () => {
    try {
      setLoading(true);
      const res = await api.get('/billing');
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load billing details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const metaInfo = data?.metaWhatsappInfo || {};
  const usage = data?.usageStats || {};

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" /> Billing & WhatsApp Account Information
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Shakktii SaaS software is completely free. WhatsApp messaging usage fees are managed directly by Meta.
          </p>
        </div>

        {/* Shakktii Free SaaS Plan Banner */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-emerald-500/30 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  Active SaaS Plan
                </span>
                <span className="text-xs text-slate-400">No payment required</span>
              </div>
              <h2 className="text-2xl font-extrabold text-white">Shakktii Free SaaS Plan</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Unlimited access to Inbox, Multi-Agent Chat, Broadcast Manager, Bot Flow Builder, Contacts Management, and Analytics.
              </p>
            </div>

            <div className="text-left md:text-right bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block font-medium">Monthly SaaS Cost</span>
              <div className="text-3xl font-black text-emerald-400">
                ₹0 <span className="text-xs font-normal text-slate-400">/ forever</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1 justify-start md:justify-end font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Free Software
              </div>
            </div>
          </div>
        </div>

        {/* Usage & Meta Account Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Messages Sent This Month */}
          <Card title="Monthly Usage Activity" subtitle="Messages processed this month">
            <div className="space-y-4 my-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-medium text-slate-400">Outbound & Inbound Messages</span>
                <span className="text-2xl font-bold font-mono text-white">
                  {(usage?.usedMessagesThisMonth || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
                <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Shakktii does not cap or restrict your message count. Message delivery throughput depends on your connected Meta Business Account tier.
                </span>
              </div>
            </div>
          </Card>

          {/* Meta WhatsApp Direct Billing Notice */}
          <Card title="Meta Direct Billing Policy" subtitle="WhatsApp Cloud API usage">
            <div className="space-y-3 my-1">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-white mb-0.5">Billed Directly by Meta</strong>
                  WhatsApp Cloud API conversation charges, if applicable under Meta policy, are billed directly to your payment method inside your Meta Business Manager.
                </div>
              </div>

              <div className="text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>No hidden fees or markups charged by Shakktii</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>You maintain full ownership of your Meta WABA</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Invoices & payment methods managed via Meta Developer Console</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Connected Meta WhatsApp Business Account Details */}
        <Card title="Connected WhatsApp Business Account" subtitle="Meta Cloud API Account Status">
          {metaInfo?.isConnected ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Business Account</span>
                <span className="text-sm font-semibold text-white mt-1 block truncate">
                  {metaInfo?.businessName || 'WhatsApp Business'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono mt-0.5 block truncate">
                  WABA ID: {metaInfo?.wabaId || 'Unset'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Connected Phone</span>
                <span className="text-sm font-semibold text-emerald-400 mt-1 block truncate">
                  {metaInfo?.displayPhoneNumber || 'Connected'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono mt-0.5 block truncate">
                  Phone ID: {metaInfo?.phoneNumberId || 'Unset'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Meta Account Tier</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {metaInfo?.messagingLimit || 'TIER_1K'}
                  </span>
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Quality: {metaInfo?.qualityRating || 'GREEN'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>WhatsApp Business Account is not yet connected to this workspace.</span>
              </div>
              <a
                href="/dashboard/onboarding"
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-all shrink-0"
              >
                Connect WhatsApp
              </a>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
