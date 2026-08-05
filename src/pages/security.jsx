import React from 'react';
import LegalLayout from '@/components/layout/LegalLayout';
import { ShieldCheck, Lock, Key, Server, Cpu, Database } from 'lucide-react';

export default function SecurityCenter() {
  return (
    <LegalLayout title="Security Center" description="SyncChat Security Practices, Encryption, Tenant Isolation, and Infrastructure Protections.">
      <div className="space-y-6">
        <div>
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
            Enterprise Security Safeguards
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-3 tracking-tight">Security Center</h1>
          <p className="text-xs text-slate-400 mt-1">Bank-grade security, multi-tenant isolation, and data encryption standards.</p>
        </div>

        <div className="prose prose-invert max-w-none text-xs text-slate-300 space-y-4 leading-relaxed">
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">1. Data Encryption & Authentication</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li><strong>Encryption in Transit:</strong> All HTTP API traffic and WebSocket push streams are encrypted using TLS 1.3 with AES-256 GCM.</li>
              <li><strong>Encryption at Rest:</strong> Database backups and media files stored on encrypted MongoDB Atlas and cloud infrastructure.</li>
              <li><strong>Stateless JWT Authentication:</strong> Bearer tokens signed with 256-bit secret keys, validated per API invocation.</li>
            </ul>
          </section>

          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">2. Strict Multi-Tenant Isolation</h2>
            <p>
              SyncChat enforces strict logical multi-tenant isolation. Every MongoDB query filter, Redis cache key, Socket.IO realtime room, and BullMQ background queue job is hard-scoped to the company tenant (`companyId`). No cross-tenant access is possible.
            </p>
          </section>

          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">3. Responsible Security Disclosure</h2>
            <p>
              If you discover a potential security vulnerability, please submit your report to <code>security@syncchat-saas.com</code>. We review all responsible disclosures within 24 hours.
            </p>
          </section>
        </div>
      </div>
    </LegalLayout>
  );
}
