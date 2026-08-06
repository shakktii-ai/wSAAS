import React from 'react';
import LegalLayout from '@/components/layout/LegalLayout';
import COMPANY from '@/config/company';

export default function DataDeletionInstructions() {
  return (
    <LegalLayout title="Data Deletion Instructions" description={`Official Data Deletion Instructions required by Meta Developer App Review and GDPR for ${COMPANY.name}.`}>
      <div className="space-y-6">
        <div>
          <span className="text-xs font-mono text-rose-400 uppercase tracking-wider bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20">
            Meta App Review Requirement
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-3 tracking-tight">Data Deletion Instructions</h1>
          <p className="text-xs text-slate-400 mt-1">Pursuant to Meta Developer Policy 11.1 &amp; GDPR Article 17 (Right to Erasure)</p>
        </div>

        <div className="prose prose-invert max-w-none text-xs text-slate-300 space-y-4 leading-relaxed">
          <section className="space-y-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">How to Request Account &amp; Data Removal</h2>
            <p>
              In accordance with Meta Developer Policies, {COMPANY.name} provides business users and Facebook accounts multiple options to request complete data deletion:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-slate-300">
              <li><strong>Via Dashboard Settings:</strong> Log in to your {COMPANY.name} Dashboard ({COMPANY.website}/dashboard), navigate to <code>/dashboard/company</code>, and click <strong>&quot;Disconnect WhatsApp &amp; Delete Workspace Data&quot;</strong>.</li>
              <li><strong>Via Facebook App Settings:</strong> Go to your Facebook Profile &gt; Settings &amp; Privacy &gt; Settings &gt; Apps and Websites &gt; Select {COMPANY.name} &gt; Click <strong>&quot;Remove&quot;</strong>.</li>
              <li><strong>Via Direct Privacy Request:</strong> Send an official deletion request email to <code>{COMPANY.privacyEmail}</code> with your WABA ID or Company Email.</li>
            </ol>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Scope of Data Purged</h2>
            <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono text-[11px] pt-1">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-850">✓ Meta WABA Credentials &amp; Tokens</div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-850">✓ WhatsApp Message History</div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-850">✓ CRM Contacts &amp; Timeline Logs</div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-850">✓ AI Knowledge Base &amp; Vector Chunks</div>
            </div>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Deletion Timeline</h2>
            <p>
              Upon receiving a verified deletion request, {COMPANY.name} immediately revokes Meta OAuth access tokens and permanently purges all stored database collections within <strong>30 calendar days</strong>.
            </p>
          </section>
        </div>
      </div>
    </LegalLayout>
  );
}
