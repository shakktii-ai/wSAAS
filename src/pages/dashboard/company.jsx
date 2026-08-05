import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Building2, MessageSquare, CheckCircle2, ShieldCheck, Key, RefreshCw } from 'lucide-react';

export default function CompanySettings() {
  const { company, refreshCompany } = useAuth();
  
  const [name, setName] = useState(company?.name || '');
  const [phone, setPhone] = useState(company?.phone || '');
  const [timeZone, setTimeZone] = useState(company?.settings?.timeZone || 'UTC');
  const [savingCompany, setSavingCompany] = useState(false);
  const [companySuccess, setCompanySuccess] = useState('');

  // WABA Config Form
  const [phoneNumberId, setPhoneNumberId] = useState(company?.whatsappConfig?.phoneNumberId || '');
  const [wabaId, setWabaId] = useState(company?.whatsappConfig?.wabaId || '');
  const [accessToken, setAccessToken] = useState(company?.whatsappConfig?.accessToken || '');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState(company?.whatsappConfig?.webhookVerifyToken || 'syncchat_verify');
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState(company?.whatsappConfig?.displayPhoneNumber || '');
  const [savingWaba, setSavingWaba] = useState(false);
  const [wabaSuccess, setWabaSuccess] = useState('');
  const [wabaError, setWabaError] = useState('');

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    setSavingCompany(true);
    setCompanySuccess('');
    try {
      const res = await api.put('/company', {
        name,
        phone,
        settings: { timeZone },
      });
      if (res.success) {
        setCompanySuccess('Company settings saved successfully!');
        refreshCompany();
      }
    } catch (err) {
      alert(err.message || 'Failed to update company');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSaveWaba = async (e) => {
    e.preventDefault();
    setSavingWaba(true);
    setWabaSuccess('');
    setWabaError('');
    try {
      const res = await api.post('/company/whatsapp', {
        phoneNumberId,
        wabaId,
        accessToken,
        webhookVerifyToken,
        displayPhoneNumber,
      });
      if (res.success) {
        setWabaSuccess('Meta WhatsApp Business Account connected successfully!');
        refreshCompany();
      }
    } catch (err) {
      setWabaError(err.message || 'Failed to connect WhatsApp account');
    } finally {
      setSavingWaba(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-400" /> Company Tenant Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage workspace identity, preferences, and Meta WhatsApp Cloud API credentials.
          </p>
        </div>

        {/* Workspace Identity Form */}
        <Card title="Workspace Profile" subtitle="General company information & localized settings">
          {companySuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {companySuccess}
            </div>
          )}

          <form onSubmit={handleUpdateCompany} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Workspace Slug
              </label>
              <input
                type="text"
                disabled
                value={company?.slug || ''}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Support Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 800 555 0199"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Time Zone
              </label>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">EST - New York</option>
                <option value="Europe/London">GMT - London</option>
                <option value="Asia/Kolkata">IST - India</option>
                <option value="Asia/Dubai">GST - Dubai</option>
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end mt-2">
              <Button type="submit" loading={savingCompany}>
                Save Profile Changes
              </Button>
            </div>
          </form>
        </Card>

        {/* Meta WhatsApp Cloud API Credentials */}
        <Card title="Official Meta WhatsApp Cloud API" subtitle="Store Phone Number ID, WABA ID & Permanent Token">
          {wabaSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {wabaSuccess}
            </div>
          )}
          {wabaError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {wabaError}
            </div>
          )}

          <form onSubmit={handleSaveWaba} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Phone Number ID *
                </label>
                <input
                  type="text"
                  required
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="e.g. 104829302910394"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  WhatsApp Business Account ID (WABA ID) *
                </label>
                <input
                  type="text"
                  required
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  placeholder="e.g. 9840293049102"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Permanent Access Token *
              </label>
              <textarea
                rows={3}
                required
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAAG..."
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Webhook Verify Token
                </label>
                <input
                  type="text"
                  value={webhookVerifyToken}
                  onChange={(e) => setWebhookVerifyToken(e.target.value)}
                  placeholder="syncchat_verify_token"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Display Business Phone
                </label>
                <input
                  type="text"
                  value={displayPhoneNumber}
                  onChange={(e) => setDisplayPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={savingWaba} icon={MessageSquare}>
                Save & Connect WABA Credentials
              </Button>
            </div>
          </form>
        </Card>

        {/* WhatsApp QR Code Access Card */}
        <Card title="Business WhatsApp QR Access Code" subtitle="Instant customer scan-to-chat deep link">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                  `https://wa.me/${(company?.whatsappConfig?.displayPhoneNumber || company?.phone || '15556586686').replace(/[^0-9]/g, '')}?text=Hello`
                )}&color=10b981&bgcolor=020617`}
                alt="WhatsApp QR Code Scanner"
                className="w-44 h-44 rounded-xl border border-emerald-500/30 p-2 bg-slate-900 shadow-xl shadow-emerald-500/10"
              />
            </div>
            <div className="space-y-3 flex-1">
              <h4 className="text-sm font-bold text-white">Scan with WhatsApp Phone Camera</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Scan this official QR Code using any mobile phone camera or WhatsApp Scanner to open a direct conversation thread with your business account.
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs">
                <span className="text-[10px] text-slate-500 block uppercase mb-0.5">Deep Link URL:</span>
                <span className="text-emerald-400 underline break-all">
                  https://wa.me/{(company?.whatsappConfig?.displayPhoneNumber || company?.phone || '15556586686').replace(/[^0-9]/g, '')}?text=Hello
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
