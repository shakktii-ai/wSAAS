import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import api from '@/services/api';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  Send,
  ShieldCheck,
  Smartphone,
  Globe,
  Settings,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Zap,
} from 'lucide-react';

export default function SaaSOnboardingWizard() {
  const [status, setStatus] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [metaReview, setMetaReview] = useState(null);
  const [loading, setLoading] = useState(true);

  // Test Message State
  const [testPhone, setTestPhone] = useState('15556586686');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState('');

  const fetchOnboardingData = async () => {
    try {
      setLoading(true);
      const [statusRes, checkRes, reviewRes] = await Promise.all([
        api.get('/onboarding/status'),
        api.get('/onboarding/checklist'),
        api.get('/onboarding/meta-review'),
      ]);
      if (statusRes.success && statusRes.data) setStatus(statusRes.data);
      if (checkRes.success && checkRes.data) setChecklist(checkRes.data.checklist || []);
      if (reviewRes.success && reviewRes.data) setMetaReview(reviewRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboardingData();
  }, []);

  const handleLaunchMetaSignup = async () => {
    try {
      const res = await api.post('/meta/embedded-signup/start');
      if (res.success && res.data) {
        const appId = res.data.appId || '2388907868182234';
        window.open(
          `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
            window.location.origin + '/api/meta/exchange-token'
          )}&scope=whatsapp_business_management,whatsapp_business_messaging`,
          '_blank',
          'width=600,height=700'
        );
      }
    } catch (err) {
      alert('Failed to launch Meta Embedded Signup');
    }
  };

  const handleSendTestMessage = async (e) => {
    e.preventDefault();
    setSendingTest(true);
    setTestResult('');
    try {
      const res = await api.post('/onboarding/test-message', { phone: testPhone });
      if (res.success) {
        setTestResult(res.message);
        fetchOnboardingData();
      }
    } catch (err) {
      alert(err.message || 'Test message failed');
    } finally {
      setSendingTest(false);
    }
  };

  const handleVerifyWebhook = async () => {
    try {
      const res = await api.post('/onboarding/verify');
      if (res.success) {
        alert(res.message);
        fetchOnboardingData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-400" /> WhatsApp Production Onboarding & Meta App Review
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Zero-friction customer onboarding setup wizard, 1-click Meta Embedded Signup, production readiness checker, and Meta compliance tools.
            </p>
          </div>
          <Button icon={Zap} onClick={handleLaunchMetaSignup}>
            Launch Meta Embedded Signup
          </Button>
        </div>

        {/* Progress Bar Overview */}
        {status && (
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">Account Setup Completion</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {status.completedStepsCount} of {status.totalSteps} setup steps completed
                </p>
              </div>
              <span className="text-xl font-extrabold text-emerald-400 font-mono">
                {status.completionPercentage}%
              </span>
            </div>

            <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-emerald-500 h-full transition-all duration-700 rounded-full"
                style={{ width: `${status.completionPercentage}%` }}
              />
            </div>
          </Card>
        )}

        {/* 9-Step Onboarding Timeline */}
        <Card title="9-Step SaaS Onboarding Wizard">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {(status?.steps || []).map((step) => (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                  step.completed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <span className="font-semibold">{step.id}. {step.title}</span>
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded">PENDING</span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Production Readiness & Test Dispatch Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Production Readiness Checklist */}
          <Card title="Production Readiness Checker" subtitle="6-Point automated compliance & Meta connectivity checks">
            <div className="space-y-3 pt-2">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-slate-300 font-medium">{item.label}</span>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                      item.status === 'PASSED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Test Message Dispatcher */}
          <Card title="Verify Live Message Dispatch" subtitle="Send an instant WhatsApp Cloud API test message to your mobile number">
            <form onSubmit={handleSendTestMessage} className="space-y-4 text-xs pt-2">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target WhatsApp Phone Number *</label>
                <input
                  type="text"
                  required
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="15556586686"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" loading={sendingTest} icon={Send}>
                  Send Test Message
                </Button>

                <Button type="button" variant="secondary" icon={RefreshCw} onClick={handleVerifyWebhook}>
                  Verify Webhook
                </Button>
              </div>

              {testResult && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                  {testResult}
                </div>
              )}
            </form>
          </Card>
        </div>

        {/* Meta App Review Compliance Data */}
        {metaReview && (
          <Card title="Meta App Review Compliance Settings" subtitle="Official credentials, permissions, and webhook configuration URLs required for Meta verification">
            <div className="space-y-4 text-xs pt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">App Mode</p>
                  <p className="text-emerald-400 font-bold mt-1">{metaReview.appMode}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Readiness Score</p>
                  <p className="text-purple-400 font-bold mt-1">{metaReview.readinessScore}%</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Business Status</p>
                  <p className="text-sky-400 font-bold mt-1">{metaReview.businessVerificationStatus}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Permissions</p>
                  <p className="text-emerald-400 font-bold mt-1">2 / 2 APPROVED</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono">
                <p><span className="text-slate-400">Webhook URL:</span> <span className="text-emerald-400">{metaReview.complianceUrls?.webhookUrl}</span></p>
                <p><span className="text-slate-400">OAuth Redirect URI:</span> <span className="text-emerald-400">{metaReview.complianceUrls?.oauthRedirectUri}</span></p>
                <p><span className="text-slate-400">Privacy Policy URL:</span> <span className="text-slate-400">{metaReview.complianceUrls?.privacyPolicyUrl}</span></p>
                <p><span className="text-slate-400">Terms of Service URL:</span> <span className="text-slate-400">{metaReview.complianceUrls?.termsOfServiceUrl}</span></p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
