import React from 'react';
import LegalLayout from '@/components/layout/LegalLayout';
import COMPANY from '@/config/company';

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" description={`${COMPANY.name} Privacy Policy for Data Protection, WhatsApp Business, and Meta Cloud API.`}>
      <div className="space-y-6">
        <div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-wider">
            Data Protection & Compliance
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-slate-500 mt-1">Effective Date: August 18, 2026</p>
        </div>

        <div className="prose max-w-none text-xs text-slate-700 space-y-6 leading-relaxed font-normal">
          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">1. Information We Collect</h2>
            <p>
              We collect information necessary to provide and operate the {COMPANY.name} platform. This includes business account credentials, user names, email addresses, password hashes (BCrypt), workspace information, and configuration settings.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">2. WhatsApp & Meta Platform Data</h2>
            <p>
              When you connect a WhatsApp Business Account via Meta Embedded Signup, we receive WhatsApp Business Account ID (WABA ID), Phone Number ID, display phone number, business manager details, and access tokens. Meta OAuth tokens and client credentials are stored strictly on our secure server-side infrastructure and are protected against browser exposure.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">3. How We Use Data</h2>
            <p>
              We process data strictly to provide, maintain, optimize, and secure the platform. This includes delivering WhatsApp messages via Meta Cloud API, running user-configured automations, executing chatbot flows, managing customer contact cards, and generating aggregated usage analytics.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">4. Customer Communication Data</h2>
            <p>
              Inbound and outbound messages, interactive responses, media attachments (images, video, audio, PDFs), and conversation histories are stored within tenant-isolated database collections. Communication data is handled strictly within the applicable business workspace.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">5. Data Storage</h2>
            <p>
              Platform data is stored in enterprise-grade, encrypted multi-tenant database systems. Customer records, chat histories, and knowledge base embeddings are isolated by workspace identifiers to prevent cross-tenant access.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">6. Data Security</h2>
            <p>
              We implement industry-standard technical safeguards, including HTTPS/TLS encryption in transit, server-side secret management, token validation, and role-based access control.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">7. Data Sharing</h2>
            <p>
              We do not sell business or customer communication data. Data is shared only with authorized infrastructure subprocessors (e.g. Meta Cloud API for message transmission) as required to deliver our services.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">8. Third-Party Services</h2>
            <p>
              Our platform interacts with Meta Platforms, Inc. APIs. Your use of Meta WhatsApp services remains subject to Meta’s own terms, privacy disclosures, and policies.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">9. Meta Platform Data Handling</h2>
            <p>
              WhatsApp data received from Meta Cloud API is processed in accordance with Meta Developer Data Policies and is retained only as long as necessary to fulfill tenant communication and automation requests.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">10. Data Retention</h2>
            <p>
              We retain account, workspace, and conversation records while your account remains active or as needed to provide our services, maintain audit records, or fulfill legal obligations.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">11. User Rights</h2>
            <p>
              Account administrators may access, review, update, or request deletion of their business and workspace data. Data deletion requests can be submitted via our Data Deletion page or by contacting support.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">12. Business Responsibilities</h2>
            <p>
              Businesses using {COMPANY.name} are responsible for obtaining appropriate customer consent prior to sending WhatsApp messages and for complying with applicable communication regulations.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">13. Children’s Privacy</h2>
            <p>
              Our services are intended for business use only and are not directed to individuals under the age of 18. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">14. Changes to Privacy Policy</h2>
            <p>
              We may update this Privacy Policy periodically. Significant updates will be reflected on this page with a revised effective date.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">15. Contact Information</h2>
            <p>
              For questions or privacy inquiries regarding this policy, please contact us at <code>{COMPANY.privacyEmail}</code>.
            </p>
          </section>
        </div>
      </div>
    </LegalLayout>
  );
}
