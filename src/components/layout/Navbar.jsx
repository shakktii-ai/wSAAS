import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Search, Bell, ShieldCheck, Wifi, WifiOff, User, Settings, LogOut, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const { user, company, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const isWabaConnected = company?.whatsappConfig?.status === 'CONNECTED';

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search conversations, contacts, templates..."
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
        </div>
      </div>

      {/* Right Action Icons & Profile */}
      <div className="flex items-center gap-4">
        {/* WABA Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60">
          {isWabaConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5" /> Meta Cloud API Connected
              </span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                <WifiOff className="w-3.5 h-3.5" /> WABA Disconnected
              </span>
            </>
          )}
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-xl bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors border border-slate-700/40"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500"></span>
        </button>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-700/50"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white text-xs shadow-md">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-white leading-tight">{user?.name}</p>
              <p className="text-[10px] text-slate-400 leading-tight">{user?.role}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 animate-slide-up">
              <div className="px-4 py-2 border-b border-slate-800">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <a
                href="/dashboard/company"
                className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
              >
                <Settings className="w-4 h-4" /> Company Settings
              </a>
              <a
                href="/dashboard/users"
                className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" /> Team & Roles
              </a>
              <div className="border-t border-slate-800 my-1"></div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
