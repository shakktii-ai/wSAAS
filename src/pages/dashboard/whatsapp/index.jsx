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
    const handleMetaMessage = async (event) => {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          if (data.event === 'FINISH') {
            const { waba_id, phone_number_id } = data.data;
            await completeExchange({ wabaId: waba_id, phoneNumberId: phone_number_id });
          } else if (data.event === 'CANCEL') {
            alert('Meta Embedded Signup was cancelled by user.');
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
      const res = await api.post('/meta/exchange-token', payload);
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
    }
  };

  // Launch Meta Embedded Signup Popup
  const launchEmbeddedSignup = () => {
    setConnecting(true);

    if (typeof window !== 'undefined' && window.FB) {
      window.FB.login(
        (response) => {
          if (response.authResponse) {
            const code = response.authResponse.code;
            completeExchange({ code });
          } else {
            // Fallback to manual setup
            setConnecting(false);
            setShowManualModal(true);
          }
        },
        {
          scope: 'whatsapp_business_management,whatsapp_business_messaging',
          extras: {
            setup: {},
            featureType: '',
            sessionInfoVersion: '2',
          },
        }
      );
    } else {
      // Fallback
      setShowManualModal(true);
      setConnecting(false);
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
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" /> WhatsApp Business Integration
            </h1>
            <p className="text-xs text-slate-400 mt-1">
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
        <Card className="border border-slate-800 bg-slate-900/80 backdrop-blur-xl relative overflow-hidden p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                  isConnected
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <Phone className="w-7 h-7" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">
                    {isConnected ? account.businessName || 'Connected Business WABA' : 'No WhatsApp Account Connected'}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isConnected
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {isConnected ? '● Connected & Active' : 'Disconnected'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
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
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20"
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
            <Card className="p-4 bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Phone Number ID</p>
                  <p className="text-xs font-mono font-bold text-white mt-0.5">{account.phoneNumberId}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">WABA ID</p>
                  <p className="text-xs font-mono font-bold text-white mt-0.5">{account.wabaId}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Quality Rating</p>
                  <p className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> {account.qualityRating}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Synced Templates</p>
                  <p className="text-xs font-bold text-white mt-0.5">{account.templateCount} Templates</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Integration Instructions & Enterprise Features */}
        <Card className="p-6 bg-slate-900/60 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-3">Enterprise Meta Cloud API Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <p className="font-semibold text-emerald-400">⚡ 1-Click Embedded Signup</p>
              <p className="text-slate-400">
                Customers connect their Meta WhatsApp Business Account directly without technical setup.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <p className="font-semibold text-teal-400">🔄 Auto Template Sync</p>
              <p className="text-slate-400">
                Synchronizes pre-approved Meta message templates directly into local collection.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <p className="font-semibold text-purple-400">🔒 Token Security & Webhooks</p>
              <p className="text-slate-400">
                Access tokens are stored encrypted server-side; webhooks deliver real-time messages.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Manual Connection Modal Fallback */}
      <Modal isOpen={showManualModal} onClose={() => setShowManualModal(false)} title="Connect Meta WABA Credentials">
        <form onSubmit={handleManualConnect} className="space-y-4 text-xs">
          <p className="text-slate-400">
            Enter your Meta Phone Number ID and WABA ID to complete instant connection:
          </p>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Phone Number ID</label>
            <input
              type="text"
              value={manualPhoneId}
              onChange={(e) => setManualPhoneId(e.target.value)}
              placeholder="e.g. 100000000000000"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">WABA ID</label>
            <input
              type="text"
              value={manualWabaId}
              onChange={(e) => setManualWabaId(e.target.value)}
              placeholder="e.g. 200000000000000"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
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
