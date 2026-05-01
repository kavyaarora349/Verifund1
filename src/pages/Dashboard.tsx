import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Search,
  Wallet
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import CountUp from 'react-countup';
import { Card, Badge, HashDisplay, StatusDot, Button, PageLoader } from '../components/ui';
import { formatCurrency, cn } from '../utils/utils';
import { useAuthStore } from '../store/authStore';
import { api, paiseStringToRupees, type BackendTransaction, type DashboardStatsResponse } from '../services/api';
import { connectPeraWallet, disconnectPeraWallet, getPeraWalletBalance } from '../services/wallet';

type DashboardData = {
  stats: DashboardStatsResponse | null;
  transactions: BackendTransaction[];
  budgets: Array<{ name: string; allocated: number; spent: number }>;
};

export default function Dashboard() {
  const { accessToken, activeRole, userName, email, refreshToken, walletAddress, setAuth } = useAuthStore();
  const [data, setData] = React.useState<DashboardData>({ stats: null, transactions: [], budgets: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [walletConnectError, setWalletConnectError] = React.useState<string | null>(null);
  const [walletLoading, setWalletLoading] = React.useState(false);
  const [walletBalance, setWalletBalance] = React.useState<number | null>(null);
  const [walletBalanceLoading, setWalletBalanceLoading] = React.useState(false);

  React.useEffect(() => {
    if (!accessToken) return;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [stats, txs, budgetTree] = await Promise.all([
          api.dashboardStats(accessToken),
          api.transactions(accessToken, "limit=8"),
          api.budgets(accessToken)
        ]);
        setData({
          stats,
          transactions: txs.data,
          budgets: budgetTree.ministries.map((m) => ({
            name: m.name.replace('Ministry of ', ''),
            allocated: paiseStringToRupees(m.allocatedAmount) / 10000000,
            spent: paiseStringToRupees(m.spentAmount) / 10000000
          }))
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [accessToken]);

  const metrics = [
    { label: 'Total Allocated', value: data.stats ? paiseStringToRupees(data.stats.totalAllocated) : 0, icon: TrendingUp, color: 'text-info', trend: 'Live' },
    { label: 'Total Disbursed', value: data.stats ? paiseStringToRupees(data.stats.totalDisbursed) : 0, icon: ShieldCheck, color: 'text-success', trend: 'Live' },
    { label: 'Flagged Txns', value: data.stats?.flaggedTransactions ?? 0, icon: AlertTriangle, color: 'text-danger', trend: 'Current', isRaw: true },
    { label: 'Pending Approvals', value: data.stats?.pendingApprovals ?? 0, icon: Clock, color: 'text-warning', trend: 'Current', isRaw: true },
  ];

  const handleWalletConnect = async () => {
    if (!activeRole || !userName) return;
    setWalletLoading(true);
    setWalletConnectError(null);
    try {
      const account = await connectPeraWallet();
      if (!account) {
        setWalletConnectError('No wallet account returned from Pera.');
        return;
      }
      setAuth({
        role: activeRole,
        userName,
        email: email ?? undefined,
        accessToken: accessToken ?? undefined,
        refreshToken: refreshToken ?? undefined,
        walletAddress: account
      });
      setWalletBalanceLoading(true);
      const balance = await getPeraWalletBalance(account);
      setWalletBalance(balance);
    } catch (err) {
      setWalletConnectError(err instanceof Error ? err.message : 'Failed to connect Pera wallet');
    } finally {
      setWalletLoading(false);
      setWalletBalanceLoading(false);
    }
  };

  const handleWalletDisconnect = async () => {
    if (!activeRole || !userName) return;
    setWalletLoading(true);
    setWalletConnectError(null);
    try {
      await disconnectPeraWallet();
      setAuth({
        role: activeRole,
        userName,
        email: email ?? undefined,
        accessToken: accessToken ?? undefined,
        refreshToken: refreshToken ?? undefined,
        walletAddress: 'N/A'
      });
      setWalletBalance(null);
    } catch (err) {
      setWalletConnectError(err instanceof Error ? err.message : 'Failed to disconnect Pera wallet');
    } finally {
      setWalletLoading(false);
    }
  };

  React.useEffect(() => {
    const run = async () => {
      if (!walletAddress || walletAddress === 'N/A') {
        setWalletBalance(null);
        return;
      }
      setWalletBalanceLoading(true);
      const balance = await getPeraWalletBalance(walletAddress);
      setWalletBalance(balance);
      setWalletBalanceLoading(false);
    };
    void run();
  }, [walletAddress]);

  if (loading) return <PageLoader label="Loading dashboard..." />;
  if (error) return <div className="text-sm text-danger">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Overview</h1>
          <p className="text-text-secondary text-sm">Real-time monitoring of public fund flows.</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="h-9"
            onClick={walletAddress && walletAddress !== 'N/A' ? handleWalletDisconnect : handleWalletConnect}
            disabled={walletLoading}
          >
            <Wallet size={16} />
            {walletLoading
              ? walletAddress && walletAddress !== 'N/A'
                ? 'Disconnecting...'
                : 'Connecting...'
              : walletAddress && walletAddress !== 'N/A'
              ? `Disconnect Wallet (${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)})${
                  walletBalanceLoading
                    ? ' • Balance: Loading...'
                    : walletBalance === null
                    ? ' • Balance: Unavailable'
                    : ` • ${walletBalance.toFixed(4)} ALGO`
                }`
              : 'Connect Pera Wallet'}
          </Button>
          <Button variant="secondary" className="h-9">
            <Search size={16} />
            Search Ledger
          </Button>
          <Button variant="primary" className="h-9">Generate Report</Button>
        </div>
      </div>
      {walletConnectError && <p className="text-xs text-danger">{walletConnectError}</p>}
      {walletAddress && walletAddress !== 'N/A' && (
        <p className="text-xs text-text-muted">
          Wallet Balance:{' '}
          {walletBalanceLoading
            ? 'Loading...'
            : walletBalance === null
            ? 'Unavailable'
            : `${walletBalance.toFixed(4)} ALGO`}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((metric, i) => (
          <Card key={i} className="relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-text-muted text-[11px] font-bold uppercase tracking-widest">{metric.label}</p>
                <h2 className="text-2xl font-bold mt-1 tracking-tight">
                  {metric.isRaw ? (
                    <CountUp end={metric.value} duration={2} />
                  ) : (
                    <CountUp end={metric.value / 10000000} duration={2} prefix="₹" suffix=" Cr" decimals={0} />
                  )}
                </h2>
                <div className="flex items-center gap-1 mt-2">
                  <span className={cn("text-[10px] font-medium", metric.color)}>{metric.trend}</span>
                </div>
              </div>
              <div className={cn("p-2 rounded-lg bg-bg-surface border border-border group-hover:scale-110 transition-transform", metric.color)}>
                <metric.icon size={20} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Departmental Spending Breakdown (₹ Cr)">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.budgets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A3347" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 12 }} 
                />
                <Tooltip 
                  cursor={{ fill: '#232D42' }}
                  contentStyle={{ backgroundColor: '#1C2437', border: '1px solid #2A3347', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Bar dataKey="allocated" fill="#2563EB" radius={[4, 4, 0, 0]} name="Allocated" />
                <Bar dataKey="spent" fill="#10B981" radius={[4, 4, 0, 0]} name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Live Alerts" className="flex flex-col">
          <div className="space-y-4 mt-4 overflow-y-auto max-h-[300px] pr-2">
            {data.transactions.filter(t => t.status === 'FLAGGED').slice(0, 5).map((txn) => (
              <div key={txn.id} className="p-3 bg-bg-surface border border-border rounded-lg space-y-2 group hover:border-danger/30 transition-colors">
                <div className="flex items-center justify-between">
                  <Badge variant="danger">{txn.flags?.[0]?.severity ?? "HIGH"}</Badge>
                  <span className="text-[10px] text-text-muted">2 mins ago</span>
                </div>
                <p className="text-sm font-medium leading-snug">{txn.flags?.[0]?.reason ?? "Flagged transaction"}</p>
                <div className="flex items-center justify-between text-[11px]">
                  <HashDisplay value={txn.blockchainTxHash || txn.id} />
                  <span className="text-text-primary font-bold">{formatCurrency(paiseStringToRupees(txn.amount))}</span>
                </div>
              </div>
            ))}
          </div>
          <Button variant="ghost" className="mt-4 w-full text-xs">View All Flags <ChevronRight size={14}/></Button>
        </Card>
      </div>

      <Card title="Recent Transactions" className="overflow-hidden">
        <div className="overflow-x-auto -mx-5 -mb-5 mt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-y border-border bg-bg-surface/50">
                <th className="px-5 py-3 text-[11px] font-bold text-text-muted uppercase tracking-widest">Hash</th>
                <th className="px-5 py-3 text-[11px] font-bold text-text-muted uppercase tracking-widest">From</th>
                <th className="px-5 py-3 text-[11px] font-bold text-text-muted uppercase tracking-widest">To</th>
                <th className="px-5 py-3 text-[11px] font-bold text-text-muted uppercase tracking-widest">Amount</th>
                <th className="px-5 py-3 text-[11px] font-bold text-text-muted uppercase tracking-widest">Status</th>
                <th className="px-5 py-3 text-[11px] font-bold text-text-muted uppercase tracking-widest">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.transactions.slice(0, 8).map((txn) => (
                <tr key={txn.id} className="hover:bg-bg-hover transition-colors cursor-pointer group">
                  <td className="px-5 py-4"><HashDisplay value={txn.blockchainTxHash || txn.id} full={txn.blockchainTxHash || txn.id} /></td>
                  <td className="px-5 py-4"><span className="text-sm font-medium">{txn.fromName}</span></td>
                  <td className="px-5 py-4"><span className="text-sm font-medium">{txn.toName}</span></td>
                  <td className="px-5 py-4 font-mono text-sm tracking-tight">{formatCurrency(paiseStringToRupees(txn.amount))}</td>
                  <td className="px-5 py-4">
                    <Badge variant={
                      txn.status === 'CONFIRMED' ? 'success' : 
                      txn.status === 'FLAGGED' ? 'danger' : 'warning'
                    }>
                      {txn.status.toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    {txn.status === 'FLAGGED' && <AlertTriangle size={16} className="text-danger animate-pulse" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
