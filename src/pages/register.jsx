import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import { Zap, Building2, User, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export default function Register() {
  const { register, socialLogin } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load Meta Facebook JavaScript SDK dynamically
    if (typeof window !== 'undefined' && !window.FB) {
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
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
      const res = await register(companyName, name, email, password);
      if (!res.success) {
        setError(res.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to register company workspace.');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookRegister = async () => {
    setError('');
    setLoading(true);

    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';

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
                  name: userData.name || 'Facebook Business Admin',
                  avatar: userData.picture?.data?.url || '',
                  socialId: userID,
                  socialToken: accessToken,
                });
                if (!res.success) setError(res.message);
              } catch (err) {
                setError('Facebook onboarding failed.');
              } finally {
                setLoading(false);
              }
            });
          } else {
            const redirectUri = `${window.location.origin}/register`;
            window.location.href = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
              redirectUri
            )}&scope=public_profile`;
          }
        },
        { scope: 'public_profile' }
      );
    } else {
      const redirectUri = `${window.location.origin}/register`;
      window.location.href = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=public_profile`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 mb-3">
            <Zap className="w-7 h-7 fill-current" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create Workspace</h1>
          <p className="text-xs text-slate-500 mt-1">Start your Shakktii WhatsApp Cloud workspace</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Company / Brand Name
            </label>
            <div className="relative">
              <Building2 className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corporation"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Your Full Name
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@acme.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
              />
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold" size="lg">
            Create Company Workspace <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <span className="relative bg-white px-3 text-xs text-slate-400 uppercase tracking-wider">
            Or Register With
          </span>
        </div>

        <button
          type="button"
          onClick={handleFacebookRegister}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
        >
          <svg className="w-4 h-4 text-[#1877F2] fill-current" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Continue with Facebook Business Login
        </button>

        <p className="text-center text-xs text-slate-500 mt-6">
          Already have a workspace?{' '}
          <Link href="/login" className="text-emerald-600 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
