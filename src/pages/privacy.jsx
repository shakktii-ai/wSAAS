import React from 'react';
import LegalLayout from '@/components/layout/LegalLayout';
import COMPANY from '@/config/company';

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" description={`${COMPANY.name} Privacy Policy for GDPR, CCPA, and Meta Cloud API compliance.`}>
      <div className="space-y-6">
        <div>
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
            Official Compliance Document
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-3 tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-slate-400 mt-1">Last Updated: August 6, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none text-xs text-slate-300 space-y-4 leading-relaxed font-normal">
          <section className="space-y-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">1. Introduction</h2>
            <p>
              {COMPANY.name} (&quot;{COMPANY.name}&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the {COMPANY.name} B2B WhatsApp Cloud API communication platform ({COMPANY.website}). This Privacy Policy explains how we collect, process, store, and safeguard data when business customers (&quot;Tenants&quot;) use our platform, APIs, and Meta Embedded Signup integrations.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li><strong>Account Information:</strong> Name, email address, password hashes (bcrypt), company tenant details, and billing records.</li>
              <li><strong>WhatsApp Business Account Data:</strong> WABA ID, Phone Number ID, display phone number, business manager ID, and OAuth access tokens provided via Meta Embedded Signup.</li>
              <li><strong>Customer Communication Data:</strong> Inbound and outbound WhatsApp text messages, media attachments (images, video, audio, PDFs), timestamps, and status receipts (sent, delivered, read).</li>
              <li><strong>AI Knowledge Base Documents:</strong> Text content, FAQs, and vector chunk embeddings uploaded to Enterprise AI Studio.</li>
            </ul>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">3. AI Processing Disclosure</h2>
            <p>
              {COMPANY.name} incorporates Enterprise AI Studio RAG (Retrieval-Augmented Generation) technology. Company knowledge documents and conversation messages are processed strictly to generate grounded customer support replies. We do NOT use tenant data to train public foundation models.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">4. Third-Party Subprocessors</h2>
            <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono text-[11px] pt-1">
              <div className="p-2 rounded bg-slate-950 border border-slate-850">• Meta Platforms Inc. (Cloud API)</div>
              <div className="p-2 rounded bg-slate-950 border border-slate-850">• OpenAI Inc. (LLM Engine)</div>
              <div className="p-2 rounded bg-slate-950 border border-slate-850">• MongoDB Atlas (Database)</div>
              <div className="p-2 rounded bg-slate-950 border border-slate-850">• Redis Cloud (Caching)</div>
            </div>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">5. GDPR & CCPA User Rights</h2>
            <p>
              Under GDPR and CCPA regulations, business administrators have the right to access, export, rectify, or permanently delete tenant data. Data deletion requests can be initiated via <a href="/data-deletion" className="text-emerald-400 underline">Data Deletion Instructions</a> or by contacting <code>{COMPANY.privacyEmail}</code>.
            </p>
          </section>
        </div>
      </div>
    </LegalLayout>
  );
}
