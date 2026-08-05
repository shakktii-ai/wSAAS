import React from 'react';
import LegalLayout from '@/components/layout/LegalLayout';

export default function CookiePolicy() {
  return (
    <LegalLayout title="Cookie Policy" description="SyncChat Cookie Policy explaining essential session and analytics cookies.">
      <div className="space-y-6">
        <div>
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
            Cookie Policy
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-3 tracking-tight">Cookie Policy</h1>
          <p className="text-xs text-slate-400 mt-1">Last Updated: August 6, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none text-xs text-slate-300 space-y-4">
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">1. What Are Cookies</h2>
            <p>
              Cookies are small text files stored on your browser to maintain active login sessions, security tokens, and user preferences across dashboard sessions.
            </p>
          </section>

          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">2. Cookies We Use</h2>
            <ul className="list-disc pl-5 space-y-1 font-mono text-[11px]">
              <li><strong>syncchat_token:</strong> Essential HTTP-only JWT authentication token.</li>
              <li><strong>syncchat_theme:</strong> User interface theme preference (Dark Mode).</li>
            </ul>
          </section>
        </div>
      </div>
    </LegalLayout>
  );
}
