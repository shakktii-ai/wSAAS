import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import {
  MessageSquare,
  MessageCircle,
  Users,
  Send,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function DashboardOverview() {
  const { user, company } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const isWabaConnected = company?.whatsappConfig?.status === 'CONNECTED' || Boolean(process.env.NEXT_PUBLIC_APP_URL);

  useEffect(() => {
    async function fetchDashboardMetrics() {
      try {
        setLoading(true);
        const res = await api.get('/analytics');
        if (res.success && res.data) {
          setMetrics(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardMetrics();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-xs">
          <div>
            <span className="px-3 py-1 text-[11px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 mb-2 inline-block">
              {company?.name || 'Workspace'} Tenant Portal
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Good day, {user?.name?.split(' ')[0] || 'Agent'} 👋
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-normal">
              Here is your Meta WhatsApp Cloud API communication status & performance summary.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/whatsapp">
              <Button variant={isWabaConnected ? 'outline' : 'primary'} icon={MessageSquare}>
                {isWabaConnected ? 'Manage WABA' : 'Connect Meta WABA'}
              </Button>
            </Link>
          </div>
        </div>

        {/* Meta WABA Connection Alert Banner */}
        {!isWabaConnected && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">WhatsApp Business Account Pending Connection</h4>
                <p className="text-xs text-slate-600">
                  Connect your Phone Number ID and Permanent Access Token to start sending & receiving messages.
                </p>
              </div>
            </div>
            <Link href="/dashboard/whatsapp">
              <Button size="sm" variant="primary" icon={ArrowRight}>
                Configure Connection
              </Button>
            </Link>
          </div>
        )}

        {/* Key Performance Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Total Contacts</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2">
              {loading ? '...' : (metrics?.totalContacts || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-semibold">
              <TrendingUp className="w-3 h-3 text-emerald-600" /> Live Mongoose DB
            </p>
          </Card>

          <Card className="hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Messages Sent / Outbound</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Send className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2">
              {loading ? '...' : (metrics?.outboundCount || metrics?.totalMessages || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Meta Cloud API SLA
            </p>
          </Card>

          <Card className="hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Active Conversations</span>
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                <MessageCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2">
              {loading ? '...' : (metrics?.totalConversations || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Shared Inbox Queue</p>
          </Card>

          <Card className="hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Meta Templates Synced</span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2">
              {loading ? '...' : (metrics?.totalTemplates || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-emerald-700 mt-1 font-semibold">Approved by Meta</p>
          </Card>
        </div>

        {/* Feature Modules Quick Access Grid */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Shakktii Workspace Modules</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title="Official WhatsApp API" subtitle="Meta Cloud Integration">
              <p className="text-xs text-slate-600 mb-4 font-normal">
                Connect your WABA, store tokens, manage message templates, and inspect webhook logs.
              </p>
              <Link href="/dashboard/whatsapp">
                <Button size="sm" variant="secondary" className="w-full">
                  Open WhatsApp Config
                </Button>
              </Link>
            </Card>

            <Card title="Shared Inbox" subtitle="Team Customer Communication">
              <p className="text-xs text-slate-600 mb-4 font-normal">
                Realtime chat, agent assignment, internal notes, pinned conversations, and contact management.
              </p>
              <Link href="/dashboard/inbox">
                <Button size="sm" variant="secondary" className="w-full">
                  Launch Shared Inbox
                </Button>
              </Link>
            </Card>

            <Card title="Automation Builder" subtitle="Visual Bot & AI Workflows">
              <p className="text-xs text-slate-600 mb-4 font-normal">
                Drag-and-drop chatbot builder, triggers, conditions, delays, and AI auto-suggested replies.
              </p>
              <Link href="/dashboard/chatbot">
                <Button size="sm" variant="secondary" className="w-full">
                  Open Bot Builder
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
