import React, { useState } from 'react';
import LegalLayout from '@/components/layout/LegalLayout';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';

export default function ContactUs() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: 'Sales Inquiry', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <LegalLayout title="Contact Us" description="Contact SyncChat Enterprise SaaS support, sales, or security team.">
      <div className="space-y-6">
        <div>
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
            Get In Touch
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-3 tracking-tight">Contact SyncChat</h1>
          <p className="text-xs text-slate-400 mt-1">Our sales & engineering team is available 24/7 to assist your business.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1 text-xs">
              <Mail className="w-5 h-5 text-emerald-400 mb-1" />
              <p className="font-bold text-white">Email Us</p>
              <p className="text-slate-400">Support: <code>support@syncchat-saas.com</code></p>
              <p className="text-slate-400">Sales: <code>sales@syncchat-saas.com</code></p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1 text-xs">
              <Phone className="w-5 h-5 text-blue-400 mb-1" />
              <p className="font-bold text-white">Call Us</p>
              <p className="text-slate-400">+1 (800) 555-SYNC</p>
              <p className="text-slate-400 font-mono text-[11px]">Mon-Fri: 9am - 6pm EST</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1 text-xs">
              <MapPin className="w-5 h-5 text-purple-400 mb-1" />
              <p className="font-bold text-white">Headquarters</p>
              <p className="text-slate-400 leading-relaxed">
                SyncChat Technologies Inc.<br />
                100 Enterprise Way, Suite 400<br />
                San Francisco, CA 94107
              </p>
            </div>
          </div>

          <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
            {submitted ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">Thank You for Reaching Out!</h3>
                <p className="text-xs text-slate-400">Our customer team has received your message and will reply within 2 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Work Email *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Inquiry Subject</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Sales Inquiry">Sales & Enterprise Pricing</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Meta App Review">Meta Integration Query</option>
                    <option value="Partnership">Partnership Opportunities</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Message *</label>
                  <textarea
                    rows={4}
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </LegalLayout>
  );
}
