import React from 'react';

export default function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div>
            {title && <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
