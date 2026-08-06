import React from 'react';
import LegalLayout from '@/components/layout/LegalLayout';
import COMPANY from '@/config/company';

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" description={`${COMPANY.name} Terms of Service and WhatsApp Business API usage guidelines.`}>
      <div className="space-y-6">
        <div>
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
            Terms & Conditions
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-3 tracking-tight">Terms of Service</h1>
          <p className="text-xs text-slate-400 mt-1">Last Updated: August 6, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none text-xs text-slate-300 space-y-4 leading-relaxed">
          <section className="space-y-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">1. Acceptance of Terms</h2>
            <p>
              By accessing or creating an account on {COMPANY.name} (&quot;Service&quot;, {COMPANY.website}), you agree to be bound by these Terms of Service. If you represent a company, you warrant that you have authority to bind your company to these terms.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">2. Meta WhatsApp API Compliance</h2>
            <p>
              Tenants connecting a WhatsApp Business Account must strictly adhere to Meta Business Terms, Meta WhatsApp Commerce Policies, and Anti-Spam Guidelines. Unsolicited messaging or spamming via Meta Cloud API is strictly prohibited and will result in immediate account suspension.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">3. Subscription & Billing</h2>
            <p>
              {COMPANY.name} offers subscription plans billed monthly or annually. Subscriptions automatically renew unless cancelled 24 hours prior to the billing date. Meta Cloud API conversation fees are billed based on Meta Business rates.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">4. Service Availability & SLA</h2>
            <p>
              We strive for 99.9% platform availability. Scheduled maintenance is announced in advance. We are not liable for outages caused by Meta Cloud API infrastructure or third-party telecommunication providers. Contact support at <code>{COMPANY.supportEmail}</code>.
            </p>
          </section>
        </div>
      </div>
    </LegalLayout>
  );
}
