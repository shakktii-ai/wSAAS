import React from 'react';
import LegalLayout from '@/components/layout/LegalLayout';
import COMPANY from '@/config/company';

export default function AboutSyncChat() {
  return (
    <LegalLayout title="About Us" description={`About ${COMPANY.name} ${COMPANY.tagline}.`}>
      <div className="space-y-6">
        <div>
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
            Company Story
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-3 tracking-tight">About {COMPANY.name}</h1>
          <p className="text-xs text-slate-400 mt-1">{COMPANY.tagline}.</p>
        </div>

        <div className="prose prose-invert max-w-none text-xs text-slate-300 space-y-4 leading-relaxed">
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Our Mission</h2>
            <p>
              {COMPANY.name} ({COMPANY.website}) was built to redefine B2B customer communication. By bridging Meta WhatsApp Cloud API with multi-agent Shared Inbox, Enterprise CRM, No-Code Visual Automation Workflows, and Multi-LLM RAG AI Studio, we enable companies to engage customers instantaneously at global scale.
            </p>
          </section>

          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Technology Architecture Stack</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono text-[11px]">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850">
                <span className="text-emerald-400 font-bold block">Next.js 14 &amp; React</span>
                Server-rendered dashboard
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850">
                <span className="text-blue-400 font-bold block">MongoDB Atlas</span>
                Document database
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850">
                <span className="text-rose-400 font-bold block">Redis &amp; BullMQ</span>
                Caching &amp; job queues
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850">
                <span className="text-amber-400 font-bold block">Socket.IO Gateway</span>
                Sub-100ms push events
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850">
                <span className="text-purple-400 font-bold block">Meta Graph v20.0</span>
                Official Cloud API
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850">
                <span className="text-teal-400 font-bold block">Multi-LLM Engine</span>
                OpenAI &amp; Gemini RAG
              </div>
            </div>
          </section>
        </div>
      </div>
    </LegalLayout>
  );
}
