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
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-slate-800 p-6 rounded-3xl">
          <div>
            <span className="px-3 py-1 text-[11px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 mb-2 inline-block">
              {company?.name || 'Workspace'} Tenant Portal
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Good day, {user?.name?.split(' ')[0] || 'Agent'} 👋
            </h1>
            <p className="text-xs text-slate-400 mt-1">
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
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">WhatsApp Business Account Pending Connection</h4>
                <p className="text-xs text-slate-400">
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
          <Card className="hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Total Contacts</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">
              {loading ? '...' : (metrics?.totalContacts || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3" /> Live Mongoose DB
            </p>
          </Card>

          <Card className="hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Messages Sent / Outbound</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Send className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">
              {loading ? '...' : (metrics?.outboundCount || metrics?.totalMessages || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Meta Cloud API SLA
            </p>
          </Card>

          <Card className="hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Active Conversations</span>
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                <MessageCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">
              {loading ? '...' : (metrics?.totalConversations || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Shared Inbox Queue</p>
          </Card>

          <Card className="hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Meta Templates Synced</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">
              {loading ? '...' : (metrics?.totalTemplates || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-emerald-400 mt-1 font-medium">Approved by Meta</p>
          </Card>
        </div>

        {/* Feature Modules Quick Access Grid */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">SyncChat Enterprise Modules</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title="Official WhatsApp API" subtitle="Meta Cloud Integration">
              <p className="text-xs text-slate-400 mb-4">
                Connect your WABA, store tokens, manage message templates, and inspect webhook logs.
              </p>
              <Link href="/dashboard/whatsapp">
                <Button size="sm" variant="secondary" className="w-full">
                  Open WhatsApp Config
                </Button>
              </Link>
            </Card>

            <Card title="Shared Inbox" subtitle="Team Customer Communication">
              <p className="text-xs text-slate-400 mb-4">
                Realtime chat, agent assignment, internal notes, pinned conversations, and contact management.
              </p>
              <Link href="/dashboard/inbox">
                <Button size="sm" variant="secondary" className="w-full">
                  Launch Shared Inbox
                </Button>
              </Link>
            </Card>

            <Card title="Automation Builder" subtitle="Visual Bot & AI Workflows">
              <p className="text-xs text-slate-400 mb-4">
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
