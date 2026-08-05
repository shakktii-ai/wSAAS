import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import { Zap, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const { login, socialLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load Meta Facebook JavaScript SDK dynamically
    if (typeof window !== 'undefined' && !window.FB) {
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '2388907868182234',
          cookie: true,
          xfbml: true,
          version: 'v20.0',
        });
      };
      (function (d, s, id) {
        var js,
          fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s);
        js.id = id;
        js.src = 'https://connect.facebook.net/en_US/sdk.js';
        fjs.parentNode.insertBefore(js, fjs);
      })(document, 'script', 'facebook-jssdk');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.message || 'Invalid email or password');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setError('');
    setLoading(true);

    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '2388907868182234';

    if (typeof window !== 'undefined' && window.FB) {
      window.FB.login(
        (response) => {
          if (response.authResponse) {
            const { accessToken, userID } = response.authResponse;
            window.FB.api('/me', { fields: 'name,email,picture' }, async (userData) => {
              try {
                const res = await socialLogin({
                  provider: 'facebook',
                  email: userData.email || `facebook_${userID}@user.com`,
                  name: userData.name || 'Facebook User',
                  avatar: userData.picture?.data?.url || '',
                  socialId: userID,
                  socialToken: accessToken,
                });
                if (!res.success) setError(res.message);
              } catch (err) {
                setError('Facebook authentication failed.');
              } finally {
                setLoading(false);
              }
            });
          } else {
            // If FB.login popup closed or blocked, use Facebook OAuth Redirect URL
            const redirectUri = `${window.location.origin}/login`;
            window.location.href = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
              redirectUri
            )}&scope=public_profile`;
          }
        },
        { scope: 'public_profile' }
      );
    } else {
      // Direct Meta Facebook OAuth Redirect
      const redirectUri = `${window.location.origin}/login`;
      window.location.href = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=public_profile`;
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await socialLogin({
        provider: 'google',
        email: `google_user_${Date.now()}@syncchat.io`,
        name: 'Google Business User',
        socialId: `google_${Date.now()}`,
      });
      if (!res.success) setError(res.message);
    } catch (err) {
      setError('Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Backdrops */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 mb-3">
            <Zap className="w-7 h-7 fill-current" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h1>
          <p className="text-xs text-slate-400 mt-1">Sign in to your SyncChat Enterprise Workspace</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all"
              />
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
            Sign In to Workspace <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <span className="relative bg-slate-900 px-3 text-xs text-slate-500 uppercase tracking-wider">
            Or Sign In With
          </span>
        </div>

        {/* Social Authentication Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
              />
            </svg>
            Google
          </button>

          <button
            type="button"
            onClick={handleFacebookLogin}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors"
          >
            <svg className="w-4 h-4 text-[#1877F2] fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Facebook
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          Don&apos;t have a company workspace yet?{' '}
          <Link href="/register" className="text-emerald-400 font-semibold hover:underline">
            Create Workspace
          </Link>
        </p>
      </div>
    </div>
  );
}
