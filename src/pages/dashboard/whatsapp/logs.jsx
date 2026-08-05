import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import api from '@/services/api';
import { Terminal, RefreshCw, Eye, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function WebhookLogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/whatsapp/webhooks/logs');
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getStatusBadge = (status) => {
    const badges = {
      PROCESSED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      FAILED: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      UNMATCHED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
    return (
      <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${badges[status] || badges.PROCESSED}`}>
        {status}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Terminal className="w-6 h-6 text-emerald-400" /> Webhook Audit & Inspection Logs
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Realtime event log stream for Meta WhatsApp Cloud API webhooks.
            </p>
          </div>
          <Button icon={RefreshCw} loading={loading} onClick={fetchLogs}>
            Refresh Webhook Feed
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Logs List Table */}
          <div className="lg:col-span-7">
            <Card title={`Logged Events (${logs.length})`}>
              <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5">Timestamp</th>
                      <th className="px-3 py-2.5">Event Type</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {logs.map((log) => (
                      <tr
                        key={log._id}
                        onClick={() => setSelectedLog(log)}
                        className={`cursor-pointer transition-colors ${
                          selectedLog?._id === log._id ? 'bg-emerald-500/10' : 'hover:bg-slate-850/50'
                        }`}
                      >
                        <td className="px-3 py-3 font-mono text-[11px] text-slate-400">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="px-3 py-3 font-medium text-white">{log.eventType}</td>
                        <td className="px-3 py-3">{getStatusBadge(log.status)}</td>
                        <td className="px-3 py-3 text-right">
                          <button className="p-1 rounded text-slate-400 hover:text-emerald-400">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* JSON Payload Viewer */}
          <div className="lg:col-span-5">
            <Card title="Raw Webhook Payload Inspector">
              {selectedLog ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                    <span>Event: {selectedLog.eventType}</span>
                    <span>{new Date(selectedLog.createdAt).toLocaleString()}</span>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[500px] scrollbar-thin">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Select an event log entry from the table to inspect the full Meta Webhook JSON payload.
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
