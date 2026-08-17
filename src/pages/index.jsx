import React, { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '@/context/AuthContext';
import {
  MessageSquare,
  Zap,
  Bot,
  Workflow,
  Users,
  FileText,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
  Server,
  Cpu,
  Send,
  MessageCircle,
  Check,
  Menu,
  X,
  Layers,
  Headphones,
  Globe,
  Database,
  Smartphone,
  ChevronRight,
  TrendingUp,
  Clock,
  Shield,
  HelpCircle,
  BadgeCheck,
} from 'lucide-react';
import COMPANY from '@/config/company';

export default function Home() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox');

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-500 selection:text-white flex flex-col justify-between">
      <Head>
        <title>{COMPANY.name} — AI-Powered WhatsApp Automation & Customer Communication</title>
        <meta
          name="description"
          content="Turn every customer conversation into growth. Shakktii helps businesses manage WhatsApp conversations, automate customer interactions, and deploy AI-powered chatbots from one platform."
        />
        <meta property="og:title" content={`${COMPANY.name} — AI-Powered WhatsApp Automation Platform`} />
        <meta
          property="og:description"
          content="Manage WhatsApp conversations, automate customer interactions, and use AI-powered chatbots from one powerful platform."
        />
        <meta property="og:type" content="website" />
      </Head>

      {/* ─── 1. STICKY NAVBAR ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:bg-emerald-700 transition-all">
              <MessageSquare className="w-5 h-5 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                SHAKKTII
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-emerald-600 uppercase">
                WhatsApp SaaS
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-emerald-600 transition-colors">
              Product
            </a>
            <a href="#how-it-works" className="hover:text-emerald-600 transition-colors">
              How It Works
            </a>
            <a href="#ai-automation" className="hover:text-emerald-600 transition-colors">
              AI Automation
            </a>
            <a href="#whatsapp" className="hover:text-emerald-600 transition-colors">
              WhatsApp Workspace
            </a>
            <a href="#security" className="hover:text-emerald-600 transition-colors">
              Security
            </a>
            <a href="#pricing" className="hover:text-emerald-600 transition-colors">
              Pricing
            </a>
          </nav>

          {/* Desktop CTA Action Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-600/20 flex items-center gap-2"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  Get Started Free <ChevronRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Slide-down Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-200 bg-white px-6 py-4 space-y-3 animate-in slide-in-from-top-2">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700 hover:text-emerald-600"
            >
              Product
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700 hover:text-emerald-600"
            >
              How It Works
            </a>
            <a
              href="#ai-automation"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700 hover:text-emerald-600"
            >
              AI Automation
            </a>
            <a
              href="#whatsapp"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700 hover:text-emerald-600"
            >
              WhatsApp Workspace
            </a>
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700 hover:text-emerald-600"
            >
              Security
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700 hover:text-emerald-600"
            >
              Pricing
            </a>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {user ? (
                <Link
                  href="/dashboard"
                  className="w-full py-2.5 text-center rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-sm"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="w-full py-2.5 text-center rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="w-full py-2.5 text-center rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-sm"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ─── 2. HERO SECTION ──────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-slate-50/80 via-white to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
              <span>AI-Powered Customer Communication & WhatsApp Automation Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Turn Every Customer Conversation Into <span className="text-emerald-600">Growth</span>
            </h1>

            {/* Supporting Text */}
            <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto">
              Shakktii helps businesses manage WhatsApp conversations, automate customer interactions, and use AI-powered chatbots from one powerful platform.
            </p>

            {/* Call To Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Link
                href={user ? '/dashboard' : '/register'}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-base hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#features"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-base hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs flex items-center justify-center gap-2"
              >
                Explore Shakktii
              </a>
            </div>

            {/* Direct Billing Transparency Note */}
            <p className="text-xs text-slate-500 font-medium pt-1 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Free to start • Zero credit card required • Connect your own WhatsApp Business Account</span>
            </p>
          </div>

          {/* Product Preview Mockup UI */}
          <div className="mt-14 max-w-5xl mx-auto rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 overflow-hidden">
            {/* Window Header */}
            <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <span className="text-xs font-mono text-slate-500 ml-2 font-medium">
                  shakktii.ai / workspace / inbox
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Meta Cloud API Active
              </div>
            </div>

            {/* Dashboard Visual Mockup Content */}
            <div className="grid grid-cols-1 md:grid-cols-12 bg-white text-slate-800 text-xs">
              {/* Left Sidebar Mock */}
              <div className="md:col-span-4 border-r border-slate-200 bg-slate-50/50 p-3 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Live WhatsApp Inbox
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    3 Active
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 text-xs">+91 98230 11212</span>
                      <span className="text-[10px] text-slate-400">Just now</span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate font-medium">
                      Hi, I want to know about your enterprise pricing & WhatsApp automation...
                    </p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="bg-emerald-50 text-emerald-700 text-[9px] font-semibold px-1.5 py-0.5 rounded border border-emerald-200">
                        AI Active
                      </span>
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-medium px-1.5 py-0.5 rounded">
                        Lead
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/60 border border-slate-200 space-y-1 opacity-80">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-800 text-xs">Acme Corporation</span>
                      <span className="text-[10px] text-slate-400">12m ago</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      Thanks! The automated template was sent to our customer list.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/60 border border-slate-200 space-y-1 opacity-80">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-800 text-xs">+91 88902 33411</span>
                      <span className="text-[10px] text-slate-400">1h ago</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      Can I get a demo of the visual chatbot builder?
                    </p>
                  </div>
                </div>
              </div>

              {/* Center Chat Window Mock */}
              <div className="md:col-span-8 p-4 flex flex-col justify-between space-y-4 bg-slate-50/20">
                {/* Chat Top Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                      +91
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">+91 98230 11212</p>
                      <p className="text-[10px] text-slate-500">Connected via Meta Cloud API</p>
                    </div>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                    Active Session
                  </span>
                </div>

                {/* Conversation Thread Messages */}
                <div className="space-y-3 py-2">
                  {/* Customer Inbound Bubble */}
                  <div className="flex flex-col items-start max-w-md">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3 text-slate-800 text-xs shadow-xs space-y-1">
                      <p>
                        Hi, I want to know about your enterprise pricing & WhatsApp automation.
                      </p>
                      <span className="text-[9px] text-slate-400 block text-right">10:42 AM</span>
                    </div>
                  </div>

                  {/* AI Automated Response Bubble */}
                  <div className="flex flex-col items-end max-w-md ml-auto">
                    <div className="bg-emerald-600 text-white rounded-2xl rounded-tr-xs p-3 text-xs shadow-xs space-y-1">
                      <p>
                        Hello! Our Shakktii platform is currently free to start. We support WhatsApp automations, AI RAG chatbots, and CRM inbox management!
                      </p>
                      <span className="text-[9px] text-emerald-100 block text-right">10:42 AM • AI Automated</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                      <Bot className="w-3 h-3 text-emerald-600" /> Powered by Shakktii Grounded AI Engine
                    </span>
                  </div>

                  {/* Quick Action Button Mock */}
                  <div className="flex gap-2 justify-end pt-1">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[10px]">
                      View Plans
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[10px]">
                      Talk to Support
                    </span>
                  </div>
                </div>

                {/* Message Input Box Mock */}
                <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value="Type a message or trigger an automation flow..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-400 text-xs cursor-default"
                  />
                  <button className="p-2 rounded-xl bg-emerald-600 text-white font-bold">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. TRUST / SOCIAL PROOF SECTION ──────────────────────────────────── */}
      <section className="py-10 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Built for businesses that want faster customer communication
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-1">
            {[
              { label: 'WhatsApp Business Cloud API', icon: MessageSquare },
              { label: 'AI RAG Automation', icon: Bot },
              { label: 'Multi-Tenant CRM', icon: Users },
              { label: 'Smart Chatbots', icon: Workflow },
              { label: 'Customer Support', icon: Headphones },
              { label: 'Lead Management', icon: TrendingUp },
            ].map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200/80 shadow-xs text-xs font-semibold text-slate-700"
                >
                  <IconComp className="w-4 h-4 text-emerald-600" />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 4. WHAT SHAKKTII DOES (FEATURE CARDS) ───────────────────────────── */}
      <section id="features" className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-14">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600">
              Core Capabilities
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Everything Your Customer Communication Needs
            </p>
            <p className="text-base text-slate-600">
              A unified suite designed for high-conversion WhatsApp messaging, automated workflows, and intelligent customer management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: '1. WhatsApp Inbox',
                desc: 'Manage customer conversations from one centralized inbox with team routing and status tracking.',
                icon: MessageSquare,
                badge: 'Team Inbox',
              },
              {
                title: '2. Automation',
                desc: 'Automatically trigger actions and responses based on customer messages and business workflows.',
                icon: Zap,
                badge: 'No-Code Rules',
              },
              {
                title: '3. AI Chatbot',
                desc: 'Let AI handle repetitive customer questions and conversations using grounded document knowledge.',
                icon: Bot,
                badge: 'Grounded RAG',
              },
              {
                title: '4. CRM & Leads',
                desc: 'Organize customer information, track conversation histories, and manage leads effectively.',
                icon: Users,
                badge: 'Customer Data',
              },
              {
                title: '5. WhatsApp Templates',
                desc: 'Create, sync, and manage approved WhatsApp message templates directly with Meta.',
                icon: FileText,
                badge: 'Meta Templates',
              },
              {
                title: '6. Analytics',
                desc: 'Understand conversation volume, response activity, and messaging performance across your workspace.',
                icon: BarChart3,
                badge: 'Insights',
              },
            ].map((card, idx) => {
              const IconComponent = card.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all space-y-4 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-800 group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-200 transition-colors">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                        {card.badge}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">{card.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-normal">
                      {card.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 5. HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-slate-50/70 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-14">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600">
              Simple Setup
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              How Shakktii Works in 3 Simple Steps
            </p>
            <p className="text-base text-slate-600">
              Get your business connected to Meta WhatsApp Cloud API and operational in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {[
              {
                step: '01',
                title: 'Connect WhatsApp',
                desc: 'Connect your WhatsApp Business Account with Shakktii using official Meta Embedded Signup.',
                icon: Smartphone,
              },
              {
                step: '02',
                title: 'Build Your Automation',
                desc: 'Create workflows, automations, trigger keywords, and AI-powered chatbot experiences.',
                icon: Workflow,
              },
              {
                step: '03',
                title: 'Engage & Grow',
                desc: 'Manage conversations, automate responses, convert leads, and scale your business.',
                icon: TrendingUp,
              },
            ].map((item, idx) => {
              const StepIcon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-8 rounded-2xl bg-white border border-slate-200 shadow-xs relative space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-extrabold text-emerald-600 font-mono">
                      {item.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                      <StepIcon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 6. AI + AUTOMATION HIGHLIGHT SECTION ───────────────────────────── */}
      <section id="ai-automation" className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              AI & Automation Integration
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Let AI Handle the Conversations That Don’t Need You
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Shakktii combines WhatsApp automation with AI-powered customer conversations so businesses can respond faster while their teams focus on conversations that actually need human attention.
            </p>
          </div>

          {/* Visual Diagram Representation */}
          <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center text-center">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1.5">
                <MessageSquare className="w-6 h-6 text-slate-700 mx-auto" />
                <p className="font-bold text-xs text-slate-900">1. Customer Message</p>
                <p className="text-[11px] text-slate-500">Inbound WhatsApp</p>
              </div>

              <div className="hidden sm:flex justify-center text-slate-400">
                <ArrowRight className="w-5 h-5" />
              </div>

              <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-xs space-y-1.5">
                <Zap className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="font-bold text-xs text-slate-900">2. Automation Engine</p>
                <p className="text-[11px] text-slate-500">Trigger Match & Rules</p>
              </div>

              <div className="hidden sm:flex justify-center text-slate-400">
                <ArrowRight className="w-5 h-5" />
              </div>

              <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-xs space-y-1.5">
                <Bot className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="font-bold text-xs text-slate-900">3. AI / Chatbot</p>
                <p className="text-[11px] text-slate-500">Grounded AI Answer</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-2 text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Instant automated response to routine queries</span>
              </div>
              <div className="flex items-center gap-2 text-slate-800">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Seamless handoff to human agent when needed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. WHATSAPP WORKSPACE SECTION ────────────────────────────────────── */}
      <section id="whatsapp" className="py-20 bg-slate-50/60 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600">
              Meta WhatsApp Workspace
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Your WhatsApp. One Powerful Workspace.
            </p>
            <p className="text-base text-slate-600">
              Designed specifically for official Meta Cloud API integration with total control over messaging, templates, and team workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Centralized Inbox', desc: 'Unified chat inbox for all customer WhatsApp messages.' },
              { title: 'Customer Conversations', desc: 'Full conversation context, unread tracking, and tags.' },
              { title: 'Automated Replies', desc: 'Rule-based triggers and keyword automations.' },
              { title: 'WhatsApp Templates', desc: 'Create and sync Meta approved message templates.' },
              { title: 'Media Messaging', desc: 'Send images, documents, audio, videos, and PDFs.' },
              { title: 'Conversation History', desc: 'Persistent chat logs with search and filtering.' },
              { title: 'Team Collaboration', desc: 'Assign conversations to team agents and managers.' },
              { title: 'Real-Time Sync', desc: 'Instant Webhook receiving and Socket.IO updates.' },
            ].map((item, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-6 font-normal">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8. FUTURE-READY / OMNICHANNEL SECTION ──────────────────────────── */}
      <section className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="max-w-2xl mx-auto text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Platform Vision
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              More Channels. One Customer Experience.
            </p>
            <p className="text-sm text-slate-600">
              Shakktii is designed to evolve into a multi-channel customer engagement hub.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { name: 'WhatsApp', status: 'Live', isLive: true },
              { name: 'Instagram', status: 'Coming Soon', isLive: false },
              { name: 'Facebook', status: 'Coming Soon', isLive: false },
              { name: 'Meta Ads', status: 'Coming Soon', isLive: false },
              { name: 'Omnichannel Leads', status: 'Coming Soon', isLive: false },
              { name: 'AI Engagement', status: 'Coming Soon', isLive: false },
            ].map((ch, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border text-center space-y-1.5 ${
                  ch.isLive
                    ? 'bg-emerald-50/60 border-emerald-200 text-slate-900'
                    : 'bg-slate-50/50 border-slate-200 text-slate-500'
                }`}
              >
                <p className="font-bold text-xs">{ch.name}</p>
                <span
                  className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    ch.isLive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {ch.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 9. SECURITY & PRIVACY SECTION ───────────────────────────────────── */}
      <section id="security" className="py-20 bg-slate-50/80 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-14">
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600">
              Data Security
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Built With Privacy & Security in Mind
            </p>
            <p className="text-base text-slate-600">
              Enterprise architecture engineered to protect business data, tokens, and customer interactions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Secure Authentication',
                desc: 'JWT session authorization and BCrypt password hashing for workspace accounts.',
                icon: Lock,
              },
              {
                title: 'Tenant-Isolated Customer Data',
                desc: 'Multi-tenant database design ensuring strict data isolation per business workspace.',
                icon: Database,
              },
              {
                title: 'Secure API Communication',
                desc: 'All endpoints and webhook interactions are encrypted over HTTPS / TLS.',
                icon: Server,
              },
              {
                title: 'Server-Side Credential Protection',
                desc: 'Meta access tokens and app secrets remain safely on the server and are never exposed to browser client APIs.',
                icon: ShieldCheck,
              },
              {
                title: 'Protected WhatsApp Integrations',
                desc: 'Official Meta Embedded Signup integration with server-side OAuth exchange.',
                icon: Shield,
              },
              {
                title: 'Controlled Access Rights',
                desc: 'Role-based access controls for workspace owners, admins, and agents.',
                icon: Users,
              },
            ].map((sec, idx) => {
              const SecIcon = sec.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                    <SecIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{sec.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {sec.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 10. PRIVACY & DATA HANDLING SECTION ──────────────────────────────── */}
      <section className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Data Stewardship
            </h2>
            <h3 className="text-2xl font-extrabold text-slate-900">Your Data. Your Business.</h3>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-4 leading-relaxed font-normal">
            <p>
              Shakktii processes business and customer communication data strictly to provide messaging, automation, chatbot, CRM, and related services.
            </p>
            <p className="font-semibold text-slate-800">
              Data processed includes:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              <li>Business account and workspace information</li>
              <li>Customer contact details and phone numbers</li>
              <li>WhatsApp conversation history, text messages, and media attachments</li>
              <li>Automation workflows, chatbot flows, and uploaded knowledge base content</li>
              <li>Technical usage and delivery log metrics</li>
            </ul>
            <p>
              Customer communication data is handled strictly within the applicable business workspace. Sensitive credentials such as Meta access tokens and application secrets remain server-side and are protected against client browser exposure.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 11. FREE SAAS PLAN / BILLING SECTION ─────────────────────────────── */}
      <section id="pricing" className="py-20 bg-slate-50/70 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600">
              Transparent Pricing
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Simple. Free to Start.
            </p>
            <p className="text-base text-slate-600">
              No subscription fee, no credit card required, and no hidden platform checkout charges.
            </p>
          </div>

          <div className="max-w-md mx-auto p-8 rounded-2xl bg-white border border-slate-200 shadow-md text-center space-y-6">
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                Shakktii Free SaaS Plan
              </span>
              <div className="text-4xl font-extrabold text-slate-900 font-mono pt-2">
                ₹0 <span className="text-sm font-normal text-slate-500 font-sans">/ month</span>
              </div>
              <p className="text-xs text-slate-600">
                Shakktii software and dashboard features are currently free for business customers.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4 text-left space-y-2.5 text-xs text-slate-700 font-medium">
              {[
                'Full WhatsApp Inbox & Team Management',
                'Visual Automation Workflow Builder',
                'AI-Powered RAG Chatbot Integration',
                'Customer CRM & Contact Management',
                'Meta WhatsApp Template Sync',
                'Analytics & Reporting Suite',
                'Official Meta Embedded Signup Integration',
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left text-[11px] text-slate-500 space-y-1">
              <span className="font-bold text-slate-700 block">Meta Direct Billing Disclaimer:</span>
              <p>
                WhatsApp/Meta messaging charges, if applicable, are handled directly by Meta and your Meta Business Account based on Meta's official WhatsApp Cloud API pricing.
              </p>
            </div>

            <Link
              href={user ? '/dashboard' : '/register'}
              className="block w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm"
            >
              Get Started Free Now
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 12. FINAL CALL-TO-ACTION ─────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="p-10 sm:p-14 rounded-3xl bg-slate-900 text-white text-center space-y-6 shadow-2xl relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight max-w-2xl mx-auto">
              Ready to Transform Your Customer Conversations?
            </h2>

            <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto font-normal">
              Connect your WhatsApp Business Account and start managing customer conversations with Shakktii today.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href={user ? '/dashboard' : '/register'}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-base hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={user ? '/dashboard' : '/login'}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800 text-white border border-slate-700 font-semibold text-base hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 13. FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-slate-50 pt-16 pb-12 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Brand Col */}
            <div className="col-span-2 space-y-4">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs">
                  <MessageSquare className="w-4 h-4 fill-current" />
                </div>
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                  SHAKKTII
                </span>
              </Link>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                AI-Powered Customer Communication & WhatsApp Automation Platform for modern businesses.
              </p>
              <p className="text-[11px] text-slate-400">
                Contact: {COMPANY.contactEmail} • {COMPANY.phone}
              </p>
            </div>

            {/* Product Col */}
            <div className="space-y-3">
              <p className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Product</p>
              <ul className="space-y-2 text-slate-600">
                <li><a href="#features" className="hover:text-emerald-600 transition-colors">WhatsApp Inbox</a></li>
                <li><a href="#features" className="hover:text-emerald-600 transition-colors">Automation Engine</a></li>
                <li><a href="#ai-automation" className="hover:text-emerald-600 transition-colors">AI RAG Chatbot</a></li>
                <li><a href="#features" className="hover:text-emerald-600 transition-colors">Customer CRM</a></li>
                <li><a href="#whatsapp" className="hover:text-emerald-600 transition-colors">WhatsApp Templates</a></li>
                <li><a href="#features" className="hover:text-emerald-600 transition-colors">Analytics Suite</a></li>
              </ul>
            </div>

            {/* Company & Resources */}
            <div className="space-y-3">
              <p className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Company</p>
              <ul className="space-y-2 text-slate-600">
                <li><Link href="/about" className="hover:text-emerald-600 transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-emerald-600 transition-colors">Contact</Link></li>
                <li><a href="#security" className="hover:text-emerald-600 transition-colors">Security Center</a></li>
                <li><Link href="/trust" className="hover:text-emerald-600 transition-colors">Trust & Uptime</Link></li>
              </ul>
            </div>

            {/* Legal Links */}
            <div className="space-y-3">
              <p className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Legal</p>
              <ul className="space-y-2 text-slate-600">
                <li><Link href="/privacy" className="hover:text-emerald-600 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-emerald-600 transition-colors">Terms of Service</Link></li>
                <li><Link href="/data-deletion" className="hover:text-emerald-600 transition-colors">Data Deletion Policy</Link></li>
                <li><Link href="/acceptable-use" className="hover:text-emerald-600 transition-colors">Acceptable Use Policy</Link></li>
                <li><Link href="/cookies" className="hover:text-emerald-600 transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Legal Disclaimer & Copyright Notice */}
          <div className="pt-8 border-t border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 text-center md:text-left">
            <div className="space-y-1">
              <p>© 2026 Shakktii. All rights reserved.</p>
              <p className="text-[10px] text-slate-400 max-w-xl">
                Shakktii is an independent software platform and is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc. or WhatsApp LLC. WhatsApp and Meta are registered trademarks of Meta Platforms, Inc.
              </p>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Meta App Review & Multi-Tenant Verified
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
