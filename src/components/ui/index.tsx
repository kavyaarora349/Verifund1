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

export const PageLoader: React.FC<{ label?: string }> = ({ label = "Loading…" }) => (
  <div className="flex min-h-[40vh] w-full items-center justify-center">
    <div className="flex flex-col items-center gap-3 text-text-muted text-sm">
      <span
        className="h-8 w-8 rounded-full border-2 border-border border-t-accent animate-spin"
        aria-hidden
      />
      <span>{label}</span>
    </div>
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
