import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-700">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-sm font-medium tracking-wide animate-pulse">Loading Shakktii Platform...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex selection:bg-emerald-600 selection:text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-6 overflow-y-auto bg-slate-50/70">{children}</main>
      </div>
    </div>
  );
}
