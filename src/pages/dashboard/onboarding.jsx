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

  const embeddedSessionRef = React.useRef({ wabaId: null, phoneNumberId: null });
  const isExchangingRef = React.useRef(false);

  const getRedirectUri = () => {
    if (process.env.META_OAUTH_REDIRECT_URI) return process.env.META_OAUTH_REDIRECT_URI;
    const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://w-saas.vercel.app');
    return `${origin.replace(/\/$/, '')}/`;
  };

  useEffect(() => {
    fetchOnboardingData();

    // Load Meta Facebook SDK dynamically
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

    // Listen to Meta Embedded Signup session events from popup window
    const handleMetaMessage = (event) => {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          if (data.event === 'FINISH') {
            const { waba_id, phone_number_id } = data.data || {};
            embeddedSessionRef.current = { wabaId: waba_id, phoneNumberId: phone_number_id };
            console.log('[META_OAUTH_FLOW]', {
              stage: 'EMBEDDED_SIGNUP_FINISH',
              hasWabaId: Boolean(waba_id),
              hasPhoneNumberId: Boolean(phone_number_id),
            });
          } else if (data.event === 'CANCEL') {
            console.log('[META_OAUTH_FLOW] Embedded Signup session CANCELLED');
            setConnecting(false);
          }
        }
      } catch (e) {
        // Non-JSON message ignore
      }
    };

    window.addEventListener('message', handleMetaMessage);
    return () => window.removeEventListener('message', handleMetaMessage);
  }, []);

  const completeExchange = async (payload) => {
    try {
      setConnecting(true);
      const redirectUri = payload.redirectUri || getRedirectUri();
      const finalPayload = { ...payload, redirectUri };

      console.log('[META_OAUTH_FLOW]', {
        stage: 'EXCHANGE_STARTED',
        hasCode: Boolean(finalPayload.code),
        hasWabaId: Boolean(finalPayload.wabaId),
        hasPhoneNumberId: Boolean(finalPayload.phoneNumberId),
      });

      const res = await api.post('/meta/exchange-token', finalPayload);
      if (res.success) {
        fetchOnboardingData();
      } else {
        setErrorMessage(res.message || 'Meta OAuth authorization exchange failed.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'WhatsApp connection was not completed. Please try connecting again.');
    } finally {
      setConnecting(false);
      isExchangingRef.current = false;
    }
  };

  const handleLaunchMetaSignup = async () => {
    if (connecting || isExchangingRef.current) return;
    setConnecting(true);
    setErrorMessage('');
    isExchangingRef.current = false;
    embeddedSessionRef.current = { wabaId: null, phoneNumberId: null };

    const redirectUri = getRedirectUri();
    let appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
    try {
      const startRes = await api.post('/meta/embedded-signup/start');
      if (startRes.success && startRes.data?.appId) {
        appId = startRes.data.appId;
      }
    } catch (e) {
      console.warn('[Meta Onboarding] Start endpoint notice:', e.message);
    }

    const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID || process.env.META_EMBEDDED_SIGNUP_CONFIG_ID;

    console.log('[META_OAUTH_FLOW]', {
      stage: 'LOGIN_STARTED',
      appId,
      configIdPresent: Boolean(configId),
      responseType: 'code',
      overrideDefaultResponseType: true,
      currentOrigin: typeof window !== 'undefined' ? window.location.origin : '',
      currentPath: typeof window !== 'undefined' ? window.location.pathname : '',
      timestamp: new Date().toISOString(),
    });

    const initAndLogin = () => {
      if (appId && window.FB) {
        try {
          window.FB.init({
            appId,
            cookie: true,
            xfbml: true,
            version: 'v20.0',
          });
        } catch (e) {}
      }

      const loginOptions = {
        scope: 'whatsapp_business_management,whatsapp_business_messaging',
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: '2',
        },
      };
      if (configId) {
        loginOptions.config_id = configId;
      }

      window.FB.login(
        (response) => {
          const code = response?.authResponse?.code;
          const accessToken = response?.authResponse?.accessToken;

          console.log('[META_OAUTH_FLOW]', {
            stage: 'FB_LOGIN_CALLBACK',
            hasCode: Boolean(code),
            hasAccessToken: Boolean(accessToken),
            authStatus: response?.status,
          });

          if ((code || accessToken) && !isExchangingRef.current) {
            isExchangingRef.current = true;
            completeExchange({
              code,
              accessToken,
              redirectUri,
              wabaId: embeddedSessionRef.current?.wabaId || undefined,
              phoneNumberId: embeddedSessionRef.current?.phoneNumberId || undefined,
            });
          } else if (!code && !accessToken) {
            setConnecting(false);
            if (response?.status !== 'unknown') {
              setErrorMessage('Meta authorization code was not returned. Please ensure popup is permitted and complete Embedded Signup.');
            }
          }
        },
        loginOptions
      );
    };

    if (typeof window !== 'undefined' && window.FB) {
      initAndLogin();
    } else {
      (function (d, s, id) {
        var js,
          fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s);
        js.id = id;
        js.src = 'https://connect.facebook.net/en_US/sdk.js';
        js.onload = () => {
          if (window.FB) initAndLogin();
          else setErrorMessage('Meta Facebook SDK could not be initialized.');
        };
        js.onerror = () => {
          setErrorMessage('Failed to load Facebook SDK. Please check your network connection.');
          setConnecting(false);
        };
        fjs.parentNode.insertBefore(js, fjs);
      })(document, 'script', 'facebook-jssdk');
    }
  };

  const isConnected = status?.isConnected;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-600" /> WhatsApp Onboarding Setup
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Connect your official WhatsApp Business Account to start sending and receiving messages in Shakktii Inbox.
          </p>
        </div>

        {/* Free SaaS Disclaimer Banner */}
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3">
          <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-slate-900 text-sm font-bold mb-0.5">Shakktii SaaS is Free to Use</strong>
            <span className="text-slate-700">
              Shakktii is free to use. WhatsApp/Meta messaging charges, if applicable, are billed directly by Meta to your Meta Business Account.
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMessage}
          </div>
        )}

        {/* Main Step Cards */}
        <div className="space-y-4">
          {/* Step 1: Create Account & Workspace */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-200">
                  ✓
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">1. Create Shakktii Account & Workspace</h3>
                  <p className="text-xs text-slate-500">Account created and workspace initialized.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
                Completed
              </span>
            </div>
          </Card>

          {/* Step 2: Connect WhatsApp via Meta */}
          <Card className={isConnected ? 'border-emerald-200 bg-white shadow-xs' : 'border-blue-200 bg-white shadow-xs'}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    isConnected ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {isConnected ? '✓' : '2'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">2. Connect WhatsApp Business Account</h3>
                    <p className="text-xs text-slate-500">Authorize Shakktii via official Meta Embedded Signup.</p>
                  </div>
                </div>

                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                  isConnected ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}>
                  {isConnected ? 'Connected' : 'Action Required'}
                </span>
              </div>

              {!isConnected ? (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <p className="text-xs text-slate-600">
                    Click the button below to launch Meta Embedded Signup. You will log in with Facebook, select your WhatsApp Business Account, select your phone number, and authorize Shakktii.
                  </p>
                  <Button
                    variant="primary"
                    onClick={handleLaunchMetaSignup}
                    disabled={connecting}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <Smartphone className="w-4 h-4" />
                    {connecting ? 'Connecting with Meta...' : 'Connect WhatsApp with Meta'}
                  </Button>
                </div>
              ) : (
                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> WhatsApp Business Account connected
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Phone number connected ({status?.displayPhoneNumber || 'Connected'})
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Webhook connected & verified
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Messaging ready
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Step 3: Go to Dashboard Inbox */}
          <Card className={isConnected ? 'border-emerald-200 bg-emerald-50/50 shadow-xs' : 'border-slate-200 bg-white opacity-70'}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">3. Access Shakktii Inbox</h3>
                <p className="text-xs text-slate-500 mt-0.5">
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
