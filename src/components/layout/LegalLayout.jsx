import React from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { MessageSquare, ShieldCheck, Lock, FileText, Globe, ExternalLink } from 'lucide-react';

export default function LegalLayout({ children, title, description }) {
  const fullTitle = `${title} | SyncChat Enterprise SaaS`;
  const metaDesc = description || 'SyncChat Legal, Compliance, Security, and Meta App Review Trust Center.';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <Head>
        <title>{fullTitle}</title>
        <meta name="description" content={metaDesc} />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-white">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
              <MessageSquare className="w-5 h-5 fill-current" />
            </div>
            SyncChat <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Legal & Trust</span>
          </Link>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/login" className="text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20">
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 space-y-8">
        {children}
      </main>

      {/* Compliance Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/90 py-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-6 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <p className="font-bold text-white uppercase text-[11px] tracking-wider">Legal & Compliance</p>
              <ul className="space-y-1.5">
                <li><Link href="/privacy" className="hover:text-emerald-400">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-emerald-400">Terms of Service</Link></li>
                <li><Link href="/data-deletion" className="hover:text-emerald-400">Data Deletion Instructions</Link></li>
                <li><Link href="/acceptable-use" className="hover:text-emerald-400">Acceptable Use Policy</Link></li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-white uppercase text-[11px] tracking-wider">Security & Trust</p>
              <ul className="space-y-1.5">
                <li><Link href="/security" className="hover:text-emerald-400">Security Center</Link></li>
                <li><Link href="/trust" className="hover:text-emerald-400">Trust Center & Uptime</Link></li>
                <li><Link href="/cookies" className="hover:text-emerald-400">Cookie Policy</Link></li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-white uppercase text-[11px] tracking-wider">Company</p>
              <ul className="space-y-1.5">
                <li><Link href="/about" className="hover:text-emerald-400">About SyncChat</Link></li>
                <li><Link href="/contact" className="hover:text-emerald-400">Contact Us</Link></li>
                <li><Link href="/dashboard" className="hover:text-emerald-400">App Dashboard</Link></li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-white uppercase text-[11px] tracking-wider">Meta Compliance</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                SyncChat is an official Meta Cloud API Partner Platform. Compliant with Meta Developer Terms & Data Protection Guidelines.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <p>© {new Date().getFullYear()} SyncChat Technologies Inc. All rights reserved.</p>
            <p className="flex items-center gap-1 font-mono text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% GDPR & Meta App Review Verified
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
