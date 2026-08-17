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
  FileText,
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
    { label: 'Templates', href: '/dashboard/templates', icon: FileText },
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
    <aside className="w-64 bg-white border-r border-slate-200 text-slate-700 flex flex-col h-screen sticky top-0 z-40 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200 bg-white">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs group-hover:bg-emerald-700 transition-colors">
            <MessageSquare className="w-5 h-5 fill-current" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight flex items-center gap-1">
              SHAKKTII
            </span>
            <span className="block text-[9px] font-bold text-emerald-600 tracking-wider uppercase">
              WhatsApp SaaS
            </span>
          </div>
        </Link>
      </div>

      {/* Tenant Context Banner */}
      <div className="p-3.5 mx-3 my-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
        <div className="overflow-hidden pr-2">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Workspace</p>
          <p className="text-xs font-bold text-slate-900 truncate">{company?.name || 'Workspace'}</p>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 shrink-0">
          {company?.plan || 'FREE'}
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = router.pathname === item.href || (item.href !== '/dashboard' && router.pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    item.badge === 'Live'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
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
      <div className="p-3 border-t border-slate-200 bg-slate-50/60">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 transition-colors">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-xs uppercase shadow-xs">
              {user?.name ? user.name[0] : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Agent User'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.role || 'MEMBER'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
