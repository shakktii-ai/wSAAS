import React from 'react';
import LegalLayout from '@/components/layout/LegalLayout';
import COMPANY from '@/config/company';

export default function TrustCenter() {
  return (
    <LegalLayout title="Trust Center" description={`${COMPANY.name} Platform System Status, Uptime Metrics, and Subprocessors Transparency.`}>
      <div className="space-y-6">
        <div>
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
            System Uptime &amp; Trust
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-3 tracking-tight">Trust Center &amp; Platform Status</h1>
          <p className="text-xs text-slate-400 mt-1">Realtime system health metrics, uptime transparency, and subprocessors disclosures.</p>
        </div>

        {/* Live Status Header */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
          <div>
            <p className="font-bold text-white text-sm">All Systems Operational</p>
            <p className="text-xs text-slate-400">Meta Cloud API, Realtime WebSockets, Database &amp; AI Studio operational</p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full">
            99.98% SLA
          </span>
        </div>

        <div className="prose prose-invert max-w-none text-xs text-slate-300 space-y-4">
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Authorized Platform Subprocessors</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2">Subprocessor</th>
                    <th className="py-2">Purpose</th>
                    <th className="py-2">Data Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  <tr>
                    <td className="py-2 text-white font-bold">Meta Platforms Inc.</td>
                    <td className="py-2">WhatsApp Business Cloud API Messaging</td>
                    <td className="py-2">USA / EU</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-white font-bold">MongoDB Inc.</td>
                    <td className="py-2">Managed Enterprise Database Storage</td>
                    <td className="py-2">AWS US-East</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-white font-bold">Redis Inc.</td>
                    <td className="py-2">In-Memory Cache &amp; Session Storage</td>
                    <td className="py-2">AWS US-East</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-white font-bold">OpenAI Inc.</td>
                    <td className="py-2">AI Studio LLM Grounding Completion Engine</td>
                    <td className="py-2">USA</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </LegalLayout>
  );
}
