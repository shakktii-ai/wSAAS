import React from 'react';
import LegalLayout from '@/components/layout/LegalLayout';
import COMPANY from '@/config/company';

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" description={`${COMPANY.name} Terms of Service and WhatsApp Cloud API usage guidelines.`}>
      <div className="space-y-6">
        <div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-wider">
            Terms & Conditions
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">Terms of Service</h1>
          <p className="text-xs text-slate-500 mt-1">Effective Date: August 18, 2026</p>
        </div>

        <div className="prose max-w-none text-xs text-slate-700 space-y-6 leading-relaxed font-normal">
          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">1. Service Description</h2>
            <p>
              {COMPANY.name} provides a software platform for managing WhatsApp Business conversations, configuring automations, deploying chatbots, managing customer contacts, and viewing messaging analytics.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">2. Account Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities conducted within your business workspace.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">3. WhatsApp & Meta Dependency</h2>
            <p>
              {COMPANY.name} is an independent software platform. WhatsApp and Meta Cloud API services are provided directly by Meta Platforms, Inc. and are subject to Meta's own terms, policies, eligibility requirements, and applicable conversation pricing.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">4. Acceptable Use</h2>
            <p>
              You agree not to use the service to send spam, unsolicited commercial messages, deceptive communications, or content that violates Meta Business Policies or applicable legal statutes.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">5. Messaging Responsibility</h2>
            <p>
              Businesses using {COMPANY.name} remain solely responsible for the content of their messages, customer consent, and compliance with privacy and telecommunication laws.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">6. Automation Responsibility</h2>
            <p>
              You are responsible for configuring and testing your automated workflows, trigger keywords, and message sequences to ensure accurate customer interactions.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">7. AI-Generated Response Disclaimer</h2>
            <p>
              AI chatbots provide automated responses based on knowledge base inputs. Businesses should review AI outputs and implement human agent handoffs for critical customer inquiries.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">8. Third-Party Services</h2>
            <p>
              Integration with third-party APIs (such as Meta Cloud API) depends on third-party service availability. {COMPANY.name} is not liable for third-party API changes, restrictions, or service interruptions.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">9. Service Availability</h2>
            <p>
              We strive to maintain high service availability; however, access may be temporarily interrupted for scheduled maintenance or infrastructure updates.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">10. Account Suspension & Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate acceptable use policies, engage in spam, or breach these Terms of Service.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">11. Intellectual Property</h2>
            <p>
              All software, UI designs, code, and trademarks associated with {COMPANY.name} remain our exclusive intellectual property.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">12. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, {COMPANY.name} shall not be liable for indirect, incidental, or consequential damages arising from service usage or third-party platform changes.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">13. Changes to Service & Terms</h2>
            <p>
              We may update these terms or modify platform features as technology evolves. Continued platform use constitutes acceptance of updated terms.
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">14. Contact Information</h2>
            <p>
              For questions regarding these Terms of Service, please contact us at <code>{COMPANY.supportEmail}</code>.
            </p>
          </section>
        </div>
      </div>
    </LegalLayout>
  );
}
