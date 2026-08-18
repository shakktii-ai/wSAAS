import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import api from '@/services/api';
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Phone,
  ShieldCheck,
  Award,
  Layers,
  FileText,
  Unlink,
  ExternalLink,
  QrCode,
  QrCode as ScanIcon,
  MessageSquare,
  AlertCircle,
  Check,
} from 'lucide-react';

export default function WhatsAppHub() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Manual fallback inputs modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualPhoneId, setManualPhoneId] = useState('');
  const [manualWabaId, setManualWabaId] = useState('');

  const embeddedSessionRef = React.useRef({ wabaId: null, phoneNumberId: null });
  const isExchangingRef = React.useRef(false);

  const getRedirectUri = () => {
    if (process.env.META_OAUTH_REDIRECT_URI) return process.env.META_OAUTH_REDIRECT_URI;
    const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://w-saas.vercel.app');
    return `${origin.replace(/\/$/, '')}/api/meta/exchange-token`;
  };

  const fetchAccount = async () => {
    try {
      setLoading(true);
      const res = await api.get('/meta/account');
      if (res.success && res.data) {
        setAccount(res.data);
      }
    } catch (err) {
      console.error('Fetch Account Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccount();

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
            console.log('[META_OAUTH_DEBUG]', {
              hasWabaId: Boolean(waba_id),
              hasPhoneNumberId: Boolean(phone_number_id),
              sessionCaptured: true,
            });
          } else if (data.event === 'CANCEL') {
            console.log('[META_OAUTH_DEBUG] Session CANCELLED');
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

      console.log('[META_OAUTH_DEBUG]', {
        hasCode: Boolean(finalPayload.code),
        hasWabaId: Boolean(finalPayload.wabaId),
        hasPhoneNumberId: Boolean(finalPayload.phoneNumberId),
        exchangeStarted: true,
      });

      const res = await api.post('/meta/exchange-token', finalPayload);
      if (res.success) {
        alert('WhatsApp Business Account connected successfully!');
        fetchAccount();
      } else {
        alert(res.message || 'Token exchange failed');
      }
    } catch (err) {
      alert(err.message || 'Failed to connect WhatsApp account');
    } finally {
      setConnecting(false);
      isExchangingRef.current = false;
    }
  };

  // Launch Meta Embedded Signup Popup
  const launchEmbeddedSignup = async () => {
    if (connecting || isExchangingRef.current) return;
    setConnecting(true);
    isExchangingRef.current = false;
    embeddedSessionRef.current = { wabaId: null, phoneNumberId: null };

    const redirectUri = getRedirectUri();
    let appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
    try {
      const startRes = await api.get('/meta/embedded-signup/start');
      if (startRes.success && startRes.data?.appId) {
        appId = startRes.data.appId;
      }
    } catch (e) {
      console.warn('[Meta Embedded Signup] Start endpoint warning:', e.message);
    }

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

      window.FB.login(
        (response) => {
          console.log('[META_OAUTH_DEBUG]', {
            hasCode: Boolean(response?.authResponse?.code),
            hasAccessToken: Boolean(response?.authResponse?.accessToken),
            authStatus: response?.status,
            exchangeStarted: false,
          });

          const code = response?.authResponse?.code;
          const accessToken = response?.authResponse?.accessToken;

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
              alert('Meta authorization code was not returned. Please ensure popup is permitted and complete Embedded Signup.');
            }
          }
        },
        {
          scope: 'whatsapp_business_management,whatsapp_business_messaging',
          response_type: 'code',
          override_default_response_type: true,
          redirect_uri: redirectUri,
          extras: {
            setup: {},
            featureType: '',
            sessionInfoVersion: '2',
          },
        }
      );
    };

    if (typeof window !== 'undefined' && window.FB) {
      initAndLogin();
    } else {
      // Dynamically load Facebook SDK if not ready
      (function (d, s, id) {
        var js,
          fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s);
        js.id = id;
        js.src = 'https://connect.facebook.net/en_US/sdk.js';
        js.onload = () => {
          if (window.FB) initAndLogin();
          else setShowManualModal(true);
        };
        js.onerror = () => {
          setShowManualModal(true);
          setConnecting(false);
        };
        fjs.parentNode.insertBefore(js, fjs);
      })(document, 'script', 'facebook-jssdk');
    }
  };

  const handleManualConnect = async (e) => {
    e.preventDefault();
    await completeExchange({
      phoneNumberId: manualPhoneId || process.env.META_PHONE_NUMBER_ID,
      wabaId: manualWabaId || process.env.META_WABA_ID,
    });
    setShowManualModal(false);
  };

  const handleSyncTemplates = async () => {
    try {
      setSyncing(true);
      const res = await api.get('/meta/templates');
      if (res.success) {
        alert(`Templates synchronized cleanly! Total: ${res.data.summary.total}`);
        fetchAccount();
      }
    } catch (err) {
      alert(err.message || 'Failed to sync templates');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your WhatsApp Business Account?')) return;
    try {
      const res = await api.post('/meta/disconnect');
      if (res.success) {
        alert('Disconnected successfully');
        fetchAccount();
      }
    } catch (err) {
      alert(err.message || 'Failed to disconnect');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading Meta WhatsApp Business configuration...
        </div>
      </DashboardLayout>
    );
  }

  const isConnected = account?.isConnected;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-600" /> WhatsApp Business Integration
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Connect your WhatsApp Business Account via Meta Embedded Signup (AiSensy, WATI & Interakt standard)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchAccount} loading={loading}>
              Refresh
            </Button>
            {isConnected && (
              <Button variant="secondary" size="sm" icon={Layers} onClick={handleSyncTemplates} loading={syncing}>
                Sync Templates
              </Button>
            )}
          </div>
        </div>

        {/* Main Status & Signup Card */}
        <Card className="border border-slate-200 bg-white relative overflow-hidden p-6 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  isConnected
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                <Phone className="w-7 h-7" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {isConnected ? account.businessName || 'Connected Business WABA' : 'No WhatsApp Account Connected'}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isConnected
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {isConnected ? '● Connected & Active' : 'Disconnected'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {isConnected
                    ? `Live Phone Number: ${account.displayPhoneNumber} • WABA ID: ${account.wabaId}`
                    : 'Click "Connect WhatsApp Business" below to launch Meta Embedded Signup'}
                </p>
              </div>
            </div>

            <div>
              {isConnected ? (
                <Button variant="danger" size="sm" icon={Unlink} onClick={handleDisconnect}>
                  Disconnect WABA
                </Button>
              ) : (
                <Button
                  size="lg"
                  loading={connecting}
                  onClick={launchEmbeddedSignup}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  <MessageSquare className="w-5 h-5 mr-2" /> Connect WhatsApp Business
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Account Details & Health Grid */}
        {isConnected && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Phone Number ID</p>
                  <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">{account.phoneNumberId}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">WABA ID</p>
                  <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">{account.wabaId}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Quality Rating</p>
                  <p className="text-xs font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> {account.qualityRating}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Synced Templates</p>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">{account.templateCount} Templates</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Integration Instructions & Enterprise Features */}
        <Card className="p-6 bg-white border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Enterprise Meta Cloud API Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="font-bold text-emerald-700">⚡ 1-Click Embedded Signup</p>
              <p className="text-slate-600">
                Customers connect their Meta WhatsApp Business Account directly without technical setup.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="font-bold text-teal-700">🔄 Auto Template Sync</p>
              <p className="text-slate-600">
                Synchronizes pre-approved Meta message templates directly into local collection.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="font-bold text-purple-700">🔒 Token Security & Webhooks</p>
              <p className="text-slate-600">
                Access tokens are stored encrypted server-side; webhooks deliver real-time messages.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Manual Connection Modal Fallback */}
      <Modal isOpen={showManualModal} onClose={() => setShowManualModal(false)} title="Connect Meta WABA Credentials">
        <form onSubmit={handleManualConnect} className="space-y-4 text-xs">
          <p className="text-slate-600 font-medium">
            Enter your Meta Phone Number ID and WABA ID to complete instant connection:
          </p>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Phone Number ID</label>
            <input
              type="text"
              value={manualPhoneId}
              onChange={(e) => setManualPhoneId(e.target.value)}
              placeholder="e.g. 100000000000000"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">WABA ID</label>
            <input
              type="text"
              value={manualWabaId}
              onChange={(e) => setManualWabaId(e.target.value)}
              placeholder="e.g. 200000000000000"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowManualModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={connecting}>
              Connect WABA Account
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
