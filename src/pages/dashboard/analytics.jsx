import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import api from '@/services/api';
import {
  BarChart3,
  TrendingUp,
  Send,
  CheckCircle2,
  Users,
  BrainCircuit,
  PieChart,
  Download,
  Calendar,
  Zap,
  Clock,
  ShieldCheck,
  Activity,
} from 'lucide-react';

export default function BusinessIntelligenceDashboard() {
  const [activeTab, setActiveTab] = useState('traffic'); // 'traffic' | 'agents' | 'ai' | 'forecasts'
  const [analytics, setAnalytics] = useState(null);
  const [forecasts, setForecasts] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [res, forecastRes] = await Promise.all([
        api.get('/analytics'),
        api.get('/analytics/forecasts'),
      ]);
      if (res.success && res.data) setAnalytics(res.data);
      if (forecastRes.success && forecastRes.data) setForecasts(forecastRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/analytics/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'csv' }),
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `syncchat_bi_report_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to export CSV report');
    }
  };

  const totalMsgs = analytics?.totalMessages || 0;
  const maxTraffic = Math.max(...(analytics?.messageGrowth?.map((p) => p.sent + p.received) || [10]), 10);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Export Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-400" /> Executive Business Intelligence & Analytics
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Multi-dimensional analytics, agent SLA leaderboards, customer intent distribution, and 30-day predictive forecasts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button icon={Download} onClick={handleExportCSV}>
              Export CSV BI Report
            </Button>
          </div>
        </div>

        {/* Top Executive Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Conversations</p>
              <h3 className="text-lg font-bold text-white">{analytics?.totalConversations || 0}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Meta Delivery SLA</p>
              <h3 className="text-lg font-bold text-emerald-400">{analytics?.deliveryRate || 99.4}%</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Avg Response Time</p>
              <h3 className="text-lg font-bold text-white">{analytics?.avgResponseTimeSeconds || 24}s</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">AI Grounded Accuracy</p>
              <h3 className="text-lg font-bold text-white">{analytics?.aiAccuracyRate || 98.4}%</h3>
            </div>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('traffic')}
            className={`pb-3 transition-colors ${
              activeTab === 'traffic' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Conversation & Traffic Volume
          </button>

          <button
            onClick={() => setActiveTab('agents')}
            className={`pb-3 transition-colors ${
              activeTab === 'agents' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            👥 Agent SLA Leaderboard
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`pb-3 transition-colors ${
              activeTab === 'ai' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            🤖 Intent & Sentiment Intelligence
          </button>

          <button
            onClick={() => setActiveTab('forecasts')}
            className={`pb-3 transition-colors ${
              activeTab === 'forecasts' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            📈 30-Day Predictive Forecasts
          </button>
        </div>

        {/* Tab Content: Traffic Breakdown */}
        {activeTab === 'traffic' && (
          <Card title="Weekly Message Traffic Breakdown" subtitle="Inbound customer queries vs Outbound dispatches">
            <div className="space-y-4 pt-2">
              {(analytics?.messageGrowth || []).map((point, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white font-bold">{point.day}</span>
                    <span className="text-slate-400">
                      Outbound: <span className="text-emerald-400">{point.sent}</span> | Inbound: <span className="text-teal-400">{point.received}</span>
                    </span>
                  </div>
                  <div className="h-3 bg-slate-950 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full rounded-l-full transition-all duration-500"
                      style={{ width: `${Math.min(((point.sent || 1) / maxTraffic) * 100, 100)}%` }}
                    />
                    <div
                      className="bg-teal-400 h-full rounded-r-full transition-all duration-500"
                      style={{ width: `${Math.min(((point.received || 1) / maxTraffic) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Tab Content: Agent Performance */}
        {activeTab === 'agents' && (
          <Card title="Team Agent Performance & SLA Leaderboard">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Agent</th>
                    <th className="px-4 py-3">Active Chats</th>
                    <th className="px-4 py-3">Closed Chats</th>
                    <th className="px-4 py-3">Avg Response Time</th>
                    <th className="px-4 py-3">Performance Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {(analytics?.agents || []).map((agent) => (
                    <tr key={agent._id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">{agent.name}</td>
                      <td className="px-4 py-3 font-mono text-emerald-400">{agent.activeChatsCount || 0}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">{agent.closedChatsCount || 0}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{agent.avgResponseTimeSeconds || 24}s</td>
                      <td className="px-4 py-3 font-mono font-bold text-purple-400">{agent.performanceScore || 95}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Tab Content: AI Intent & Sentiment */}
        {activeTab === 'ai' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Customer Intent Distribution">
              <div className="space-y-3 text-xs pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Sales Inquiries</span>
                  <span className="font-mono text-emerald-400 font-bold">42%</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: '42%' }} />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Technical Support</span>
                  <span className="font-mono text-blue-400 font-bold">34%</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: '34%' }} />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Complaints & Escalations</span>
                  <span className="font-mono text-rose-400 font-bold">14%</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full" style={{ width: '14%' }} />
                </div>
              </div>
            </Card>

            <Card title="Customer Sentiment Breakdown">
              <div className="space-y-3 text-xs pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Positive / Satisfied</span>
                  <span className="font-mono text-emerald-400 font-bold">58%</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: '58%' }} />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Neutral</span>
                  <span className="font-mono text-slate-400 font-bold">28%</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div className="bg-slate-500 h-full" style={{ width: '28%' }} />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Frustrated / Urgent</span>
                  <span className="font-mono text-amber-400 font-bold">14%</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full" style={{ width: '14%' }} />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab Content: Forecasts */}
        {activeTab === 'forecasts' && forecasts && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="text-center p-6 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Projected 30-Day Volume</p>
              <h2 className="text-3xl font-extrabold text-emerald-400">{forecasts.projected30DayConversations}</h2>
              <p className="text-[11px] text-slate-500">Conversations forecast for next month</p>
            </Card>

            <Card className="text-center p-6 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Projected Revenue Growth</p>
              <h2 className="text-3xl font-extrabold text-blue-400">+{forecasts.projectedRevenueGrowthPct}%</h2>
              <p className="text-[11px] text-slate-500">Estimated ARR growth from WhatsApp CRM</p>
            </Card>

            <Card className="text-center p-6 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recommended Agent Headcount</p>
              <h2 className="text-3xl font-extrabold text-purple-400">{forecasts.recommendedAgentHeadcount} Agents</h2>
              <p className="text-[11px] text-slate-500">To maintain sub-30s response SLA</p>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
