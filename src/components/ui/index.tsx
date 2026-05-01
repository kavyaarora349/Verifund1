import React from 'react';
import { cn } from '../../utils/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className }) => {
  const variants = {
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    info: 'bg-info/10 text-info border-info/20',
    neutral: 'bg-bg-hover text-text-secondary border-border',
  };

  return (
    <span className={cn(
      "px-2 py-0.5 rounded text-[11px] font-medium border uppercase tracking-wider",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};

interface HashDisplayProps {
  value: string;
  className?: string;
  full?: string;
}

import { Copy } from 'lucide-react';
import { formatHash } from '../../utils/utils';

export const HashDisplay: React.FC<HashDisplayProps> = ({ value, className, full }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(full || value);
  };

  return (
    <div className={cn("inline-flex items-center gap-2 font-mono text-text-hash group", className)}>
      <span title={full || value}>{formatHash(value)}</span>
      <button 
        onClick={copyToClipboard}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-text-primary"
      >
        <Copy size={12} />
      </button>
    </div>
  );
};

export const StatusDot: React.FC<{ status: 'live' | 'pending' | 'offline' }> = ({ status }) => {
  const colors = {
    live: 'bg-success',
    pending: 'bg-warning',
    offline: 'bg-text-muted',
  };

  return (
    <span className="relative flex h-2 w-2">
      {status === 'live' && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
      )}
      <span className={cn("relative inline-flex rounded-full h-2 w-2", colors[status])}></span>
    </span>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className, title }) => (
  <div className={cn("bg-bg-card border border-border rounded-xl p-5", className)}>
    {title && <h3 className="text-text-secondary text-xs uppercase mb-4 tracking-widest">{title}</h3>}
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ children, className, variant = 'primary', ...props }) => {
  const variants = {
    primary: 'bg-accent hover:bg-accent-hover text-white',
    secondary: 'bg-bg-hover hover:bg-bg-card border border-border text-text-primary',
    danger: 'bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30',
    ghost: 'hover:bg-bg-hover text-text-secondary hover:text-text-primary',
  };
  return (
    <button 
      className={cn("px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-sm inline-flex items-center justify-center gap-2", variants[variant], className)} 
      {...props}
    >
      {children}
    </button>
  );
};

export const PageLoader: React.FC<{ label?: string }> = ({ label = 'Loading data...' }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-text-muted">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-accent"></span>
        </span>
        <p className="text-sm font-medium">{label}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="h-24 rounded-xl border border-border bg-bg-card animate-pulse"></div>
        <div className="h-24 rounded-xl border border-border bg-bg-card animate-pulse"></div>
        <div className="h-24 rounded-xl border border-border bg-bg-card animate-pulse"></div>
      </div>
      <div className="h-64 rounded-xl border border-border bg-bg-card animate-pulse"></div>
    </div>
  );
};
