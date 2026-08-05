import React, { useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import {
  MessageSquare,
  Send,
  FileText,
  Terminal,
  Wifi,
  WifiOff,
  Image as ImageIcon,
  Video,
  File,
  Mic,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function WhatsAppHub() {
  const { company } = useAuth();
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  
  // Test Message Form State
  const [recipient, setRecipient] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [textBody, setTextBody] = useState('Hello from SyncChat Enterprise WhatsApp Platform!');
  const [mediaUrl, setMediaUrl] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe');
  const [mediaCaption, setMediaCaption] = useState('SyncChat Welcome Graphic');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [sendError, setSendError] = useState('');

  const phoneNumberId = company?.whatsappConfig?.phoneNumberId || process.env.NEXT_PUBLIC_META_PHONE_NUMBER_ID || '1279365541920553';
  const wabaId = company?.whatsappConfig?.wabaId || process.env.NEXT_PUBLIC_META_WABA_ID || '27142090378802643';
  const isWabaConnected = company?.whatsappConfig?.status === 'CONNECTED' || Boolean(phoneNumberId && wabaId);

  const handleSendTestMessage = async (e) => {
    e.preventDefault();
    setSending(true);
    setSendResult(null);
    setSendError('');

    try {
      const res = await api.post('/whatsapp/send', {
        to: recipient,
        type: messageType,
        body: textBody,
        mediaUrl: ['image', 'video', 'document', 'audio'].includes(messageType) ? mediaUrl : undefined,
        mediaCaption: ['image', 'video', 'document'].includes(messageType) ? mediaCaption : undefined,
      });

      if (res.success) {
        setSendResult(res.data);
      }
    } catch (err) {
      setSendError(err.message || 'Failed to send WhatsApp message');
    } finally {
      setSending(false);
    }
  };

  // QR Code Scanner State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [prefilledText, setPrefilledText] = useState('Hello SyncChat Team! I would like to enquire about your WhatsApp services.');
  const [fetchingQr, setFetchingQr] = useState(false);

  const fetchQrCode = async (text) => {
    try {
      setFetchingQr(true);
      const res = await api.get(`/company/whatsapp/qrcode?prefilledText=${encodeURIComponent(text || prefilledText)}`);
      if (res.success && res.data) {
        setQrData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingQr(false);
    }
  };

  const openQrModal = () => {
    setIsQrModalOpen(true);
    fetchQrCode(prefilledText);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-emerald-400" /> Meta WhatsApp Cloud API Hub
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage Meta WABA credentials, scan QR access code, dispatch test payloads & sync templates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={openQrModal}>
              📱 Business QR Code
            </Button>
            <Link href="/dashboard/whatsapp/templates">
              <Button variant="secondary" icon={FileText}>
                Templates
              </Button>
            </Link>
            <Link href="/dashboard/whatsapp/logs">
              <Button variant="secondary" icon={Terminal}>
                Logs
              </Button>
            </Link>
            <Button icon={Send} disabled={!isWabaConnected} onClick={() => setIsTestModalOpen(true)}>
              Test Payload
            </Button>
          </div>
        </div>

        {/* Credentials Summary Card */}
        <Card title="WABA Connection Overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Account Status</span>
              <div className="flex items-center gap-2 mt-2">
                {isWabaConnected ? (
                  <>
                    <Wifi className="w-5 h-5 text-emerald-400" />
                    <span className="text-base font-bold text-emerald-400">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-5 h-5 text-amber-400" />
                    <span className="text-base font-bold text-amber-400">Disconnected</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Phone Number ID</span>
              <p className="text-sm font-mono text-white truncate mt-2">
                {phoneNumberId}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">WABA Account ID</span>
              <p className="text-sm font-mono text-white truncate mt-2">
                {wabaId}
              </p>
            </div>
          </div>
        </Card>

        {/* Message Capability Matrix */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
            Supported Outbound Message Engines
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card title="Text Engine" subtitle="Plain text & URL previews">
              <p className="text-xs text-slate-400">Send formatted text messages with emoji and link previews.</p>
            </Card>
            <Card title="Image & Media" subtitle="JPEG, PNG, WebP">
              <p className="text-xs text-slate-400">High-resolution image dispatch with dynamic captions.</p>
            </Card>
            <Card title="Video & Document" subtitle="MP4, PDF, DOCX">
              <p className="text-xs text-slate-400">Send media attachments with custom filenames.</p>
            </Card>
            <Card title="Audio Notes" subtitle="AAC, MP3, Voice">
              <p className="text-xs text-slate-400">Dispatch voice clips and audio broadcasts.</p>
            </Card>
            <Card title="Meta Templates" subtitle="Pre-Approved HSM">
              <p className="text-xs text-slate-400">Send marketing & utility templates with variable parameters.</p>
            </Card>
            <Card title="Interactive Buttons" subtitle="Quick Reply & List">
              <p className="text-xs text-slate-400">Process button clicks and list selections via webhooks.</p>
            </Card>
          </div>
        </div>

        {/* Test Payload Sender Modal */}
        <Modal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} title="Send Test WhatsApp Payload">
          {sendError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {sendError}
            </div>
          )}

          {sendResult && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Message dispatched! WAMID: {sendResult.message?.wamid}
            </div>
          )}

          <form onSubmit={handleSendTestMessage} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Recipient Phone Number (with Country Code) *
              </label>
              <input
                type="text"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. 15551234567"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Payload Type
              </label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
              >
                <option value="text">Text Message</option>
                <option value="image">Image Attachment</option>
                <option value="video">Video Attachment</option>
                <option value="document">Document Attachment</option>
                <option value="audio">Audio Attachment</option>
              </select>
            </div>

            {messageType === 'text' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Message Text
                </label>
                <textarea
                  rows={3}
                  value={textBody}
                  onChange={(e) => setTextBody(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            )}

            {['image', 'video', 'document', 'audio'].includes(messageType) && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Public Media Direct URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Media Caption (Optional)
                  </label>
                  <input
                    type="text"
                    value={mediaCaption}
                    onChange={(e) => setMediaCaption(e.target.value)}
                    placeholder="Attachment description"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsTestModalOpen(false)}>
                Close
              </Button>
              <Button type="submit" loading={sending} icon={Send}>
                Dispatch Payload
              </Button>
            </div>
          </form>
        </Modal>

        {/* WhatsApp QR Code Access & Scanner Modal */}
        <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="WhatsApp Business Access QR Code">
          <div className="space-y-4 text-center">
            <p className="text-xs text-slate-300">
              Scan this QR Code using any WhatsApp phone camera to open a direct customer conversation thread with your business account.
            </p>

            <div className="flex justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800">
              {fetchingQr ? (
                <div className="py-12 text-xs text-slate-400">Generating WhatsApp QR Code...</div>
              ) : qrData?.qrCodeImageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={qrData.qrCodeImageUrl}
                  alt="WhatsApp Business QR Code"
                  className="w-56 h-56 rounded-xl border border-emerald-500/30 p-2 bg-slate-900 shadow-xl shadow-emerald-500/10"
                />
              ) : (
                <div className="py-12 text-xs text-rose-400">Failed to load QR code</div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 text-left">
                Prefilled Customer Message
              </label>
              <input
                type="text"
                value={prefilledText}
                onChange={(e) => {
                  setPrefilledText(e.target.value);
                  fetchQrCode(e.target.value);
                }}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60 font-mono"
              />
            </div>

            {qrData?.whatsappDeepLink && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-left">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">WhatsApp Direct Deep Link:</span>
                <a
                  href={qrData.whatsappDeepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-emerald-400 underline break-all"
                >
                  {qrData.whatsappDeepLink}
                </a>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsQrModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
