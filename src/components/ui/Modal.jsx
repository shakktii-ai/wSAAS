import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, maxWidth = 'max-w-lg', children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className={`bg-white border border-slate-200 w-full ${maxWidth} max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col animate-slide-up`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/80 shrink-0">
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-70px)] bg-white">{children}</div>
      </div>
    </div>
  );
}
