import React from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { MessageSquare, ShieldCheck, ArrowLeft } from 'lucide-react';
import COMPANY from '@/config/company';

export default function LegalLayout({ children, title, description }) {
  const fullTitle = `${title} | ${COMPANY.name} SaaS Compliance`;
  const metaDesc = description || `${COMPANY.name} Legal, Compliance, Security, and Data Privacy Documentation.`;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <Head>
        <title>{fullTitle}</title>
        <meta name="description" content={metaDesc} />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:type" content="website" />
      </Head>

      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-slate-900 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:bg-emerald-700 transition-colors">
              <MessageSquare className="w-5 h-5 fill-current" />
            </div>
            {COMPANY.name} <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">Legal & Policy</span>
          </Link>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/" className="text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
            <Link href="/login" className="text-slate-600 hover:text-slate-900 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-sm">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 space-y-8">
        {children}
      </main>

      {/* Compliance Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-12 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-6 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <p className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Legal & Policy</p>
              <ul className="space-y-1.5">
                <li><Link href="/privacy" className="hover:text-emerald-600">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-emerald-600">Terms of Service</Link></li>
                <li><Link href="/data-deletion" className="hover:text-emerald-600">Data Deletion Policy</Link></li>
                <li><Link href="/acceptable-use" className="hover:text-emerald-600">Acceptable Use Policy</Link></li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Security & Trust</p>
              <ul className="space-y-1.5">
                <li><Link href="/security" className="hover:text-emerald-600">Security Center</Link></li>
                <li><Link href="/trust" className="hover:text-emerald-600">Trust & Uptime</Link></li>
                <li><Link href="/cookies" className="hover:text-emerald-600">Cookie Policy</Link></li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Company</p>
              <ul className="space-y-1.5">
                <li><Link href="/about" className="hover:text-emerald-600">About {COMPANY.name}</Link></li>
                <li><Link href="/contact" className="hover:text-emerald-600">Contact Us</Link></li>
                <li><Link href="/dashboard" className="hover:text-emerald-600">App Dashboard</Link></li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Meta Compliance Notice</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {COMPANY.name} is an independent software platform. WhatsApp and Meta are registered trademarks of Meta Platforms, Inc.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <p>{COMPANY.copyright}</p>
            <p className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Multi-Tenant Data Protection Verified
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
