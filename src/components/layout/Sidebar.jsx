import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  MessageSquare,
  MessageCircle,
  Users,
  Send,
  Bot,
  Sparkles,
  BarChart3,
  UserCog,
  Building2,
  LogOut,
  Zap,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';

export default function Sidebar() {
  const router = useRouter();
  const { user, company, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'WhatsApp Account', href: '/dashboard/whatsapp', icon: MessageSquare, badge: company?.whatsappConfig?.status === 'CONNECTED' ? 'Live' : 'Connect' },
    { label: 'Shared Inbox', href: '/dashboard/inbox', icon: MessageCircle },
    { label: 'Contacts', href: '/dashboard/contacts', icon: Users },
    { label: 'Broadcasts', href: '/dashboard/broadcasts', icon: Send },
    { label: 'Chatbot Builder', href: '/dashboard/chatbot', icon: Bot },
    { label: 'Automations', href: '/dashboard/automations', icon: Zap },
    { label: 'AI Assistant Studio', href: '/dashboard/ai', icon: Sparkles },
    { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { label: 'Billing & Plans', href: '/dashboard/billing', icon: CreditCard },
    { label: 'Team Users', href: '/dashboard/users', icon: UserCog },
    { label: 'Company Settings', href: '/dashboard/company', icon: Building2 },
  ];

  if (user?.role === 'SUPER_ADMIN') {
    navItems.push({ label: 'Super Admin', href: '/dashboard/superadmin', icon: ShieldCheck });
  }

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-screen sticky top-0 z-40 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Zap className="w-6 h-6 text-slate-950 fill-current" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1">
              Sync<span className="text-emerald-400">Chat</span>
            </span>
            <span className="block text-[10px] font-medium text-slate-400 tracking-wider uppercase">
              Enterprise SaaS
            </span>
          </div>
        </Link>
      </div>

      {/* Tenant Context Banner */}
      <div className="p-4 mx-3 my-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
        <div className="overflow-hidden pr-2">
          <p className="text-xs text-slate-400 font-medium">Active Workspace</p>
          <p className="text-sm font-semibold text-white truncate">{company?.name || 'Workspace'}</p>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
          {company?.plan || 'PRO'}
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = router.pathname === item.href || (item.href !== '/dashboard' && router.pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    item.badge === 'Live'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Footer Card */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-white text-xs uppercase">
              {user?.name ? user.name[0] : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-white truncate">{user?.name || 'Agent User'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.role || 'MEMBER'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
