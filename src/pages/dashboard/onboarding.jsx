import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import api from '@/services/api';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Globe,
  ArrowRight,
  ExternalLink,
  Info,
} from 'lucide-react';

export default function SaaSOnboardingWizard() {
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchOnboardingData = async () => {
    try {
      setLoading(true);
      const statusRes = await api.get('/onboarding/status');
      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data);
      }
    } catch (err) {
      console.error('Failed to load onboarding status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboardingData();
  }, []);

  const handleLaunchMetaSignup = async () => {
    setConnecting(true);
    setErrorMessage('');
    try {
      const res = await api.post('/meta/embedded-signup/start');
      if (res.success && res.data) {
        const appId = res.data.appId || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
        const redirectUri = window.location.origin + '/api/meta/exchange-token';
        
        const popup = window.open(
          `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
            redirectUri
          )}&scope=whatsapp_business_management,whatsapp_business_messaging`,
          '_blank',
          'width=600,height=700'
        );

        // Poll popup or window closure to refresh connection status
        const popupTimer = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(popupTimer);
            setConnecting(false);
            fetchOnboardingData();
          }
        }, 1500);
      } else {
        setErrorMessage('WhatsApp connection was not completed. Please try connecting again.');
        setConnecting(false);
      }
    } catch (err) {
      setErrorMessage(err.message || 'WhatsApp connection was not completed. Please try connecting again.');
      setConnecting(false);
    }
  };

  const isConnected = status?.isConnected;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-400" /> WhatsApp Onboarding & Connection Setup
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Connect your official WhatsApp Business Account to start sending and receiving messages in Shakktii Inbox.
          </p>
        </div>

        {/* Free SaaS Disclaimer Banner */}
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3">
          <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-white text-sm font-semibold mb-0.5">Shakktii SaaS is Free to Use</strong>
            <span>
              Shakktii is free to use. WhatsApp/Meta messaging charges, if applicable, are billed directly by Meta to your Meta Business Account.
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMessage}
          </div>
        )}

        {/* Main Step Cards */}
        <div className="space-y-4">
          {/* Step 1: Create Account & Workspace */}
          <Card className="border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                  ✓
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">1. Create Shakktii Account & Workspace</h3>
                  <p className="text-xs text-slate-400">Account created and workspace initialized.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full">
                Completed
              </span>
            </div>
          </Card>

          {/* Step 2: Connect WhatsApp via Meta */}
          <Card className={isConnected ? 'border-emerald-500/40' : 'border-blue-500/40 shadow-lg shadow-blue-500/5'}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    isConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {isConnected ? '✓' : '2'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">2. Connect WhatsApp Business Account</h3>
                    <p className="text-xs text-slate-400">Authorize Shakktii via official Meta Embedded Signup.</p>
                  </div>
                </div>

                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                  isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {isConnected ? 'Connected' : 'Action Required'}
                </span>
              </div>

              {!isConnected ? (
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <p className="text-xs text-slate-300">
                    Click the button below to launch Meta Embedded Signup. You will log in with Facebook, select your WhatsApp Business Account, select your phone number, and authorize Shakktii.
                  </p>
                  <Button
                    variant="primary"
                    onClick={handleLaunchMetaSignup}
                    disabled={connecting}
                    className="w-full md:w-auto flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-4 h-4" />
                    {connecting ? 'Connecting with Meta...' : 'Connect WhatsApp with Meta'}
                  </Button>
                </div>
              ) : (
                <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> WhatsApp Business Account connected
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Phone number connected ({status?.displayPhoneNumber || 'Connected'})
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Webhook connected & verified
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Messaging ready
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Step 3: Go to Dashboard Inbox */}
          <Card className={isConnected ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 opacity-60'}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white">3. Access Shakktii Inbox</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Start sending broadcasts, automated replies, and managing live customer conversations.
                </p>
              </div>

              <Button
                variant={isConnected ? 'primary' : 'secondary'}
                disabled={!isConnected}
                onClick={() => router.push('/dashboard/inbox')}
                className="w-full md:w-auto flex items-center justify-center gap-2"
              >
                Go to Inbox <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
