import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Database, 
  PieChart, 
  HandCoins,
  AlertCircle, 
  CheckSquare, 
  FileText, 
  Settings, 
  Globe,
  LogOut,
  Shield
} from 'lucide-react';
import { cn } from '../../utils/utils';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { disconnectPeraWallet } from '../../services/wallet';

export const Sidebar: React.FC = () => {
  const { activeRole, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await disconnectPeraWallet();
    if (refreshToken) {
      try {
        await api.logout(refreshToken);
      } catch {
        // ignore network error during local logout
      }
    }
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview', icon: LayoutDashboard, path: '/dashboard', roles: ['Admin', 'Vendor', 'Finance Officer', 'Dept Head'] },
    { label: 'Ledger Explorer', icon: Database, path: '/ledger', roles: ['Admin', 'Vendor', 'Finance Officer', 'Dept Head'] },
    { label: 'Budget Allocation', icon: PieChart, path: '/budget', roles: ['Admin', 'Vendor', 'Finance Officer', 'Dept Head'] },
    { label: 'Request Money', icon: HandCoins, path: '/request-money', roles: ['Admin', 'Vendor', 'Finance Officer', 'Dept Head'] },
    { label: 'Fraud & Flags', icon: AlertCircle, path: '/flags', roles: ['Admin', 'Vendor', 'Finance Officer'] },
    { label: 'Approvals', icon: CheckSquare, path: '/approvals', roles: ['Admin', 'Vendor', 'Finance Officer', 'Dept Head'] },
    { label: 'Audit Reports', icon: FileText, path: '/audit', roles: ['Admin', 'Vendor'] },
    { label: 'Admin Panel', icon: Settings, path: '/admin', roles: ['Admin'] },
    { label: 'Public Portal', icon: Globe, path: '/public', roles: ['Admin', 'Vendor', 'Finance Officer', 'Dept Head', 'Public'] },
  ];

  const filteredItems = navItems.filter(item => activeRole && item.roles.includes(activeRole));

  return (
    <div className="w-60 bg-bg-surface border-r border-border flex flex-col h-screen fixed left-0 top-0 z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center text-white">
          <Shield size={24} />
        </div>
        <span className="font-semibold text-xl tracking-tight">VeriFund</span>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1">
        {filteredItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "sidebar-link",
              isActive && "sidebar-link-active"
            )}
          >
            <item.icon size={18} />
            <span className="text-sm font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-danger hover:bg-danger/10 transition-colors text-sm font-medium"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
};

import { StatusDot, Badge } from '../ui';
import { formatHash } from '../../utils/utils';

export const Topbar: React.FC = () => {
  const { activeRole, walletAddress, userName } = useAuthStore();
  const [blockNumber, setBlockNumber] = React.useState<number | null>(null);

  React.useEffect(() => {
    const run = async () => {
      try {
        const sync = await api.publicLastSync();
        if (sync.lastSyncedAt) {
          setBlockNumber(Math.floor(new Date(sync.lastSyncedAt).getTime() / 1000));
        }
      } catch {
        setBlockNumber(null);
      }
    };
    void run();
  }, []);

  return (
    <header className="h-14 bg-bg-surface border-b border-border fixed top-0 right-0 left-60 z-10 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-text-muted font-mono text-xs">
          <StatusDot status="live" />
          <span>{blockNumber ? `Sync #${blockNumber.toLocaleString()}` : 'Sync unavailable'}</span>
        </div>
        <div className="w-px h-4 bg-border"></div>
        <span className="text-xs text-text-muted uppercase tracking-widest font-mono">[LIVE API]</span>
      </div>

      <div className="flex items-center gap-4">
        <Badge variant={activeRole === 'Admin' ? 'danger' : 'info'}>{activeRole}</Badge>
        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold">{userName}</span>
          <span className="text-[10px] text-text-hash font-mono">{walletAddress && formatHash(walletAddress)}</span>
        </div>
      </div>
    </header>
  );
};

export const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-bg-base">
      <Sidebar />
      <Topbar />
      <main className="ml-60 pt-14 p-6 overflow-y-auto min-h-screen">
        {children}
      </main>
    </div>
  );
};
