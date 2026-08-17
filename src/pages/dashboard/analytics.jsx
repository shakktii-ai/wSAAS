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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-600" /> Business Intelligence & Analytics
            </h1>
            <p className="text-xs text-slate-600 mt-1">
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
          <Card className="flex items-center gap-3 shadow-xs">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Conversations</p>
              <h3 className="text-lg font-bold text-slate-900">{analytics?.totalConversations || 0}</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3 shadow-xs">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Meta Delivery SLA</p>
              <h3 className="text-lg font-bold text-emerald-700">{analytics?.deliveryRate || 99.4}%</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3 shadow-xs">
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Avg Response Time</p>
              <h3 className="text-lg font-bold text-slate-900">{analytics?.avgResponseTimeSeconds || 24}s</h3>
            </div>
          </Card>

          <Card className="flex items-center gap-3 shadow-xs">
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">AI Grounded Accuracy</p>
              <h3 className="text-lg font-bold text-slate-900">{analytics?.aiAccuracyRate || 98.4}%</h3>
            </div>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 space-x-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('traffic')}
            className={`pb-3 transition-colors ${
              activeTab === 'traffic' ? 'text-emerald-700 border-b-2 border-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            📊 Conversation & Traffic Volume
          </button>

          <button
            onClick={() => setActiveTab('agents')}
            className={`pb-3 transition-colors ${
              activeTab === 'agents' ? 'text-emerald-700 border-b-2 border-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            👥 Agent SLA Leaderboard
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`pb-3 transition-colors ${
              activeTab === 'ai' ? 'text-emerald-700 border-b-2 border-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            🤖 Intent & Sentiment Intelligence
          </button>

          <button
            onClick={() => setActiveTab('forecasts')}
            className={`pb-3 transition-colors ${
              activeTab === 'forecasts' ? 'text-emerald-700 border-b-2 border-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
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
                    <span className="text-slate-900 font-bold">{point.day}</span>
                    <span className="text-slate-500">
                      Outbound: <span className="text-emerald-700 font-bold">{point.sent}</span> | Inbound: <span className="text-teal-700 font-bold">{point.received}</span>
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                    <div
                      className="bg-emerald-600 h-full rounded-l-full transition-all duration-500"
                      style={{ width: `${Math.min(((point.sent || 1) / maxTraffic) * 100, 100)}%` }}
                    />
                    <div
                      className="bg-teal-500 h-full rounded-r-full transition-all duration-500"
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
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Agent</th>
                    <th className="px-4 py-3">Active Chats</th>
                    <th className="px-4 py-3">Closed Chats</th>
                    <th className="px-4 py-3">Avg Response Time</th>
                    <th className="px-4 py-3">Performance Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(analytics?.agents || []).map((agent) => (
                    <tr key={agent._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">{agent.name}</td>
                      <td className="px-4 py-3 font-mono text-emerald-700 font-bold">{agent.activeChatsCount || 0}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{agent.closedChatsCount || 0}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{agent.avgResponseTimeSeconds || 24}s</td>
                      <td className="px-4 py-3 font-mono font-bold text-purple-700">{agent.performanceScore || 95}%</td>
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
                  <span className="text-slate-700 font-medium">Sales Inquiries</span>
                  <span className="font-mono text-emerald-700 font-bold">42%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div className="bg-emerald-600 h-full" style={{ width: '42%' }} />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-medium">Technical Support</span>
                  <span className="font-mono text-blue-700 font-bold">34%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div className="bg-blue-600 h-full" style={{ width: '34%' }} />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-medium">Complaints & Escalations</span>
                  <span className="font-mono text-rose-700 font-bold">14%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div className="bg-rose-600 h-full" style={{ width: '14%' }} />
                </div>
              </div>
            </Card>

            <Card title="Customer Sentiment Breakdown">
              <div className="space-y-3 text-xs pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-medium">Positive / Satisfied</span>
                  <span className="font-mono text-emerald-700 font-bold">58%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div className="bg-emerald-600 h-full" style={{ width: '58%' }} />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-medium">Neutral</span>
                  <span className="font-mono text-slate-600 font-bold">28%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div className="bg-slate-400 h-full" style={{ width: '28%' }} />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-medium">Frustrated / Urgent</span>
                  <span className="font-mono text-amber-700 font-bold">14%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div className="bg-amber-500 h-full" style={{ width: '14%' }} />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab Content: Forecasts */}
        {activeTab === 'forecasts' && forecasts && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="text-center p-6 space-y-2 shadow-xs">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Projected 30-Day Volume</p>
              <h2 className="text-3xl font-black text-emerald-700">{forecasts.projected30DayConversations}</h2>
              <p className="text-[11px] text-slate-500 font-medium">Conversations forecast for next month</p>
            </Card>

            <Card className="text-center p-6 space-y-2 shadow-xs">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Projected Revenue Growth</p>
              <h2 className="text-3xl font-black text-blue-700">+{forecasts.projectedRevenueGrowthPct}%</h2>
              <p className="text-[11px] text-slate-500 font-medium">Estimated ARR growth from WhatsApp CRM</p>
            </Card>

            <Card className="text-center p-6 space-y-2 shadow-xs">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recommended Agent Headcount</p>
              <h2 className="text-3xl font-black text-purple-700">{forecasts.recommendedAgentHeadcount} Agents</h2>
              <p className="text-[11px] text-slate-500 font-medium">To maintain sub-30s response SLA</p>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
