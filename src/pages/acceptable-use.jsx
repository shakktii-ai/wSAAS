import React from 'react';
import LegalLayout from '@/components/layout/LegalLayout';

export default function AcceptableUsePolicy() {
  return (
    <LegalLayout title="Acceptable Use Policy" description="SyncChat Acceptable Use Policy and WhatsApp Cloud API Messaging Guidelines.">
      <div className="space-y-6">
        <div>
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
            Platform Usage Guidelines
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-3 tracking-tight">Acceptable Use Policy</h1>
          <p className="text-xs text-slate-400 mt-1">Last Updated: August 6, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none text-xs text-slate-300 space-y-4">
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">1. Anti-Spam & Consent Policy</h2>
            <p>
              All WhatsApp messaging sent via SyncChat must be explicitly consented to by the receiving end-user. Sending bulk unsolicited messages, buying contact lists, or circumventing user opt-outs is strictly prohibited and subject to automated account termination.
            </p>
          </section>

          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">2. Meta Commerce Restrictions</h2>
            <p>
              Tenants must comply with Meta Commerce & Business Policies. Content involving illegal products, deceptive claims, malware, or harassment will be reported to Meta security teams.
            </p>
          </section>
        </div>
      </div>
    </LegalLayout>
  );
}
