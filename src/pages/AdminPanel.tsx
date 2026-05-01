import React from 'react';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Ban, 
  Sliders, 
  HardDrive, 
  Activity, 
  MoreVertical, 
  ShieldCheck, 
  Power,
  CheckCircle
} from 'lucide-react';
import { Card, Badge, Button, HashDisplay, StatusDot, PageLoader } from '../components/ui';
import { cn } from '../utils/utils';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function AdminPanel() {
  const { accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = React.useState('Users');
  const [users, setUsers] = React.useState<any[]>([]);
  const [blacklist, setBlacklist] = React.useState<any[]>([]);
  const [rules, setRules] = React.useState<any[]>([]);
  const [health, setHealth] = React.useState<any>(null);
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!accessToken) return;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [u, b, r, h, a] = await Promise.all([
          api.users(accessToken),
          api.blacklist(accessToken),
          api.fraudRules(accessToken),
          api.systemHealth(accessToken),
          api.auditLogs(accessToken)
        ]);
        setUsers(u.data as any[]);
        setBlacklist(b.data as any[]);
        setRules(r.data as any[]);
        setHealth(h);
        setAuditLogs((a.data as any[]).slice(0, 20));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [accessToken]);

  if (loading) return <PageLoader label="Loading admin data..." />;
  if (error) return <div className="text-sm text-danger">{error}</div>;

  const tabs = [
    { name: 'Users', icon: UsersIcon },
    { name: 'Blacklist', icon: Ban },
    { name: 'Thresholds', icon: Sliders },
    { name: 'System', icon: HardDrive },
    { name: 'Activity Log', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Sliders className="text-accent" />
            Admin Control Center
          </h1>
          <p className="text-text-secondary text-sm">Manage system permissions, fraud thresholds, and user access levels.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="h-9">
            <Activity size={16} />
            System Status
          </Button>
          <Button variant="primary" className="h-9">
            <UserPlus size={16} />
            Add User
          </Button>
        </div>
      </div>

      <div className="flex border-b border-border mb-6">
        {tabs.map(tab => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={cn(
              "px-6 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-all",
              activeTab === tab.name ? "border-accent text-accent bg-accent/5" : "border-transparent text-text-muted hover:text-text-primary"
            )}
          >
            <tab.icon size={16} />
            {tab.name}
          </button>
        ))}
      </div>

      {activeTab === 'Users' && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-surface/50 border-b border-border">
                <th className="px-5 py-4 text-[11px] font-bold text-text-muted uppercase tracking-widest">Name</th>
                <th className="px-5 py-4 text-[11px] font-bold text-text-muted uppercase tracking-widest">Role</th>
                <th className="px-5 py-4 text-[11px] font-bold text-text-muted uppercase tracking-widest">Dept</th>
                <th className="px-5 py-4 text-[11px] font-bold text-text-muted uppercase tracking-widest">Wallet</th>
                <th className="px-5 py-4 text-[11px] font-bold text-text-muted uppercase tracking-widest">Status</th>
                <th className="px-5 py-4 text-[11px] font-bold text-text-muted uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-bg-hover transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold font-mono uppercase">
                        {user.name.split(' ').map(n=>n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{user.name}</p>
                        <p className="text-[10px] text-text-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><Badge variant="info">{user.role}</Badge></td>
                  <td className="px-5 py-4"><span className="text-xs">{user.department || '—'}</span></td>
                  <td className="px-5 py-4"><HashDisplay value={user.walletAddress} /></td>
                  <td className="px-5 py-4">
                     <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                       <span className="text-xs">{user.isActive ? 'active' : 'inactive'}</span>
                     </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button className="p-1 hover:text-accent transition-colors"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === 'Thresholds' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Card title="Anomaly Detection Rules">
              <div className="space-y-6 mt-4">
                 {rules.map((rule, i) => (
                   <div key={i} className="space-y-2">
                      <label className="text-xs text-text-muted">{rule.name}</label>
                      <div className="flex gap-2">
                         <input type="text" defaultValue={JSON.stringify(rule.config)} className="flex-1 bg-bg-surface border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent" />
                         <span className="text-xs flex items-center text-text-muted">{rule.isEnabled ? 'enabled' : 'disabled'}</span>
                      </div>
                   </div>
                 ))}
                 <Button className="w-full">Save Changes</Button>
              </div>
           </Card>
           <Card title="Operational Hours">
              <div className="space-y-4 mt-4">
                 <p className="text-xs text-text-secondary leading-relaxed mb-4">
                   Transactions outside these hours will be automatically flagged for auditor review.
                 </p>
                 <div className="flex gap-4 items-center">
                    <div className="flex-1 space-y-2">
                       <label className="text-[10px] text-text-muted uppercase font-bold">Start Time</label>
                       <input type="time" defaultValue="09:00" className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent" />
                    </div>
                    <div className="flex-1 space-y-2">
                       <label className="text-[10px] text-text-muted uppercase font-bold">End Time</label>
                       <input type="time" defaultValue="18:00" className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent" />
                    </div>
                 </div>
                 <div className="flex items-center gap-2 p-3 bg-bg-surface rounded border border-dashed border-border mt-4">
                    <Power size={14} className="text-warning" />
                    <span className="text-[10px] text-text-muted italic">System will allow emergency payout during off-hours with 2FA + Vendor Signoff.</span>
                 </div>
              </div>
           </Card>
        </div>
      )}

      {activeTab === 'Blacklist' && (
        <Card title="Blocked Entities & Wallets">
           <div className="space-y-4 mt-4">
              <div className="flex gap-2">
                 <input type="text" placeholder="Wallet address or Vendor Name..." className="flex-1 bg-bg-surface border border-border rounded-lg px-4 text-sm outline-none focus:border-accent" />
                 <Button variant="primary">Block Entity</Button>
              </div>
              <div className="bg-bg-surface/50 rounded-xl border border-border divide-y divide-border">
                 {blacklist.map((item, i) => (
                   <div key={i} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-danger/10 text-danger rounded"><Ban size={16}/></div>
                         <div>
                            <p className="text-sm font-bold">{item.vendorName || item.walletAddress || 'Entity'}</p>
                            <p className="text-[10px] text-text-muted">{item.reason}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] text-text-muted uppercase font-bold">{new Date(item.createdAt).toLocaleDateString()}</p>
                         <button className="text-xs text-danger font-medium hover:underline mt-1">Remove</button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </Card>
      )}

      {activeTab === 'System' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <Card className="lg:col-span-2" title="Node Connectivity">
              <div className="space-y-4 mt-4">
                 {[
                   { name: 'Database', status: health?.database === 'UP' ? 'live' : 'offline', ping: '—' },
                   { name: 'Redis', status: health?.redis === 'UP' ? 'live' : 'offline', ping: '—' },
                   { name: 'Algorand', status: health?.blockchain?.algorand === 'UP' ? 'live' : 'offline', ping: '—' },
                   { name: 'Fabric', status: health?.blockchain?.fabric === 'UP' ? 'live' : 'offline', ping: '—' },
                 ].map((node, i) => (
                   <div key={i} className="flex items-center justify-between p-3 bg-bg-surface rounded-lg border border-border">
                      <div className="flex gap-3">
                         <StatusDot status={node.status as any} />
                         <span className="text-sm font-medium">{node.name}</span>
                      </div>
                      <span className="text-xs font-mono text-text-muted">{node.ping}</span>
                   </div>
                 ))}
              </div>
           </Card>
           <Card title="Security Level">
              <div className="flex flex-col items-center justify-center h-full space-y-6 pt-4">
                 <div className="relative">
                    <div className="w-32 h-32 rounded-full border-8 border-accent flex flex-col items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.2)]">
                       <ShieldCheck size={48} className="text-accent" />
                       <span className="text-[10px] font-bold uppercase mt-1 tracking-widest">Active</span>
                    </div>
                    <div className="absolute top-0 right-0 w-8 h-8 bg-success rounded-full flex items-center justify-center text-white border-4 border-bg-card">
                       <CheckCircle size={16} />
                    </div>
                 </div>
                 <div className="text-center">
                    <p className="text-lg font-bold">Standard Enforcing</p>
                    <p className="text-xs text-text-muted mt-1 px-4 italic">System is strictly enforcing all multi-sig and anomaly rules defined on-chain.</p>
                 </div>
                 <Button variant="danger" className="w-full">Lockdown System</Button>
              </div>
           </Card>
        </div>
      )}

      {activeTab === 'Activity Log' && (
        <Card title="Recent Audit Logs">
          <div className="space-y-2 mt-4 max-h-[460px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded border border-border bg-bg-surface">
                <p className="text-xs font-semibold">{log.action}</p>
                <p className="text-[11px] text-text-muted">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
