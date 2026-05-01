import React from 'react';
import { 
  AlertTriangle, 
  Search, 
  ArrowUpRight, 
  ExternalLink, 
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Card, Badge, Button, HashDisplay, PageLoader } from '../components/ui';
import { formatCurrency, cn } from '../utils/utils';
import { format, subDays } from 'date-fns';
import { api, paiseStringToRupees, type FlagFeedItem } from '../services/api';
import { useAuthStore } from '../store/authStore';

const FLAG_TREND_DATA = Array.from({ length: 15 }, (_, i) => ({
  date: format(subDays(new Date(), 14 - i), 'dd MMM'),
  flags: Math.floor(Math.random() * 10) + 2
}));

export default function FraudFlags() {
  const { accessToken } = useAuthStore();
  const [feed, setFeed] = React.useState<FlagFeedItem[]>([]);
  const [stats, setStats] = React.useState<{ total: number; critical: number; underReview: number; cleared: number }>({
    total: 0,
    critical: 0,
    underReview: 0,
    cleared: 0
  });
  const [categoryData, setCategoryData] = React.useState<Array<{ name: string; count: number }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!accessToken) {
      setError('Session expired. Please sign in again.');
      setLoading(false);
      return;
    }
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [feedResp, statResp, listResp] = await Promise.all([
          api.flagsFeed(accessToken),
          api.flagsStats(accessToken),
          api.flagsList(accessToken)
        ]);
        const openBySeverity = statResp.openBySeverity;
        const critical = openBySeverity.CRITICAL ?? 0;
        const underReview = Object.values(openBySeverity).reduce((a, b) => a + b, 0);
        const total = listResp.data.length;
        const cleared = Math.max(total - underReview, 0);
        setStats({ total, critical, underReview, cleared });
        setCategoryData(
          Object.entries(statResp.byCategory).map(([name, count]) => ({ name: name.replace(/_/g, ' '), count }))
        );
        setFeed(feedResp.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load flags");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [accessToken]);

  if (loading) return <PageLoader label="Loading fraud flags..." />;
  if (error) return <div className="text-sm text-danger">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <ShieldAlert className="text-danger" />
            Fraud & Flags
          </h1>
          <p className="text-text-secondary text-sm">Automated anomaly detection and suspicious activity monitoring.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-l-4 border-l-danger">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-text-muted uppercase">Total Flags</p>
              <h2 className="text-3xl font-bold mt-1">{stats.total}</h2>
            </div>
            <div className="p-2 bg-danger/10 text-danger rounded-lg"><AlertCircle size={20} /></div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-text-muted uppercase">Critical Severity</p>
              <h2 className="text-3xl font-bold mt-1 text-orange-500">{stats.critical}</h2>
            </div>
            <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg"><ShieldAlert size={20} /></div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-warning">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-text-muted uppercase">Under Review</p>
              <h2 className="text-3xl font-bold mt-1 text-warning">{stats.underReview}</h2>
            </div>
            <div className="p-2 bg-warning/10 text-warning rounded-lg"><Clock size={20} /></div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-success">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-text-muted uppercase">Cleared</p>
              <h2 className="text-3xl font-bold mt-1 text-success">{stats.cleared}</h2>
            </div>
            <div className="p-2 bg-success/10 text-success rounded-lg"><CheckCircle2 size={20} /></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Flag Distribution by Category">
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A3347" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1C2437', border: '1px solid #2A3347' }} />
                <Bar dataKey="count" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Traffic Anomaly Trend (30 Days)">
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={FLAG_TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A3347" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1C2437', border: '1px solid #2A3347' }} />
                <Line type="monotone" dataKey="flags" stroke="#EF4444" strokeWidth={3} dot={{ fill: '#EF4444' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Active Investigations</h2>
          <div className="flex gap-2">
            {['All', 'Critical', 'High', 'Medium', 'Low'].map(f => (
              <button key={f} className="px-3 py-1 rounded-full text-[11px] font-bold uppercase border border-border hover:bg-bg-hover transition-colors">
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feed.map((txn) => (
            <div 
              key={txn.id} 
              className={cn(
                "p-5 rounded-xl border bg-bg-card transition-all group overflow-hidden relative",
                txn.severity === 'CRITICAL' ? "border-danger/50 shadow-lg shadow-danger/5" : "border-border"
              )}
            >
              {txn.severity === 'CRITICAL' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-danger"></div>
              )}
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant={txn.severity === 'CRITICAL' ? 'danger' : 'warning'}>{txn.severity} Severity</Badge>
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{txn.category}</span>
                </div>
                <div className="flex items-center gap-1 text-danger font-mono font-bold text-xs">
                  <ArrowUpRight size={14} />
                  {txn.aiScore}% Suspicious
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-accent transition-colors flex items-center gap-2">
                    {txn.reason}
                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100" />
                  </h3>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Identified potential anomaly in payout to <span className="text-text-primary">{txn.transaction.toName}</span>.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border/50">
                   <div>
                     <p className="text-[10px] text-text-muted uppercase font-bold">Amount</p>
                     <p className="text-sm font-bold font-mono">{formatCurrency(paiseStringToRupees(txn.transaction.amount))}</p>
                   </div>
                   <div>
                     <p className="text-[10px] text-text-muted uppercase font-bold">Transaction Hash</p>
                     <HashDisplay value={txn.transaction.id} />
                   </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-bg-surface flex items-center justify-center text-text-muted">
                      <Clock size={12} />
                    </div>
                    <span className="text-[11px] text-text-muted">{format(new Date(txn.createdAt), 'dd MMM, HH:mm')}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="h-8 text-[11px] px-3">Ignore</Button>
                    <Button variant="primary" className="h-8 text-[11px] px-3">Review Details</Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
