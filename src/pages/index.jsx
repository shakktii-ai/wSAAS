import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Zap } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-500/20 mb-4 animate-bounce">
        <Zap className="w-8 h-8 fill-current" />
      </div>
      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-2" />
      <p className="text-sm font-medium tracking-wide">Initializing SyncChat Platform...</p>
    </div>
  );
}
