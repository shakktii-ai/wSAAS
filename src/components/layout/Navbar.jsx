import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Search, Bell, ShieldCheck, Wifi, WifiOff, User, Settings, LogOut, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const { user, company, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const isWabaConnected = company?.whatsappConfig?.status === 'CONNECTED';

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search conversations, contacts, templates..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
          />
        </div>
      </div>

      {/* Right Action Icons & Profile */}
      <div className="flex items-center gap-4">
        {/* WABA Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
          {isWabaConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5" /> Meta Cloud API Connected
              </span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                <WifiOff className="w-3.5 h-3.5" /> WABA Disconnected
              </span>
            </>
          )}
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border border-slate-200"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-600"></span>
        </button>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-xs shadow-xs">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">{user?.name}</p>
              <p className="text-[10px] text-slate-500 leading-tight">{user?.role}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 animate-slide-up">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>
              <a
                href="/dashboard/company"
                className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors font-medium"
              >
                <Settings className="w-4 h-4 text-slate-500" /> Company Settings
              </a>
              <a
                href="/dashboard/users"
                className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors font-medium"
              >
                <ShieldCheck className="w-4 h-4 text-slate-500" /> Team & Roles
              </a>
              <div className="border-t border-slate-100 my-1"></div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
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
