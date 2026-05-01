import React from 'react';
import { 
  Globe, 
  Search, 
  ArrowRight, 
  TrendingUp, 
  Users, 
  Heart, 
  Zap,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  Treemap, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell 
} from 'recharts';
import { Card, Badge, Button, PageLoader } from '../components/ui';
import { formatCurrency, cn } from '../utils/utils';
import { api, paiseStringToRupees } from '../services/api';

export default function PublicPortal() {
  const [summary, setSummary] = React.useState<any>(null);
  const [lastSync, setLastSync] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const run = async () => {
      try {
        const [s, sync] = await Promise.all([api.publicSummary(), api.publicLastSync()]);
        setSummary(s);
        setLastSync(sync.lastSyncedAt);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const treemapData = (summary?.ministries ?? []).map((m: any) => ({
    name: String(m.name || '').replace('Ministry of ', ''),
    size: paiseStringToRupees(m.allocatedAmount ?? 0),
    spent: paiseStringToRupees(m.spentAmount ?? 0)
  }));

  const publicStats = [
    { label: 'Total Country Budget', value: Math.round(paiseStringToRupees(summary?.totalAllocated ?? 0) / 10000000), suffix: 'Cr', icon: Globe, color: 'text-accent' },
    { label: 'Ministries Tracked', value: treemapData.length, suffix: '', icon: Zap, color: 'text-warning' },
    { label: 'Verified Expenditure', value: Math.round(paiseStringToRupees(summary?.totalDisbursed ?? 0) / 10000000), suffix: 'Cr', icon: TrendingUp, color: 'text-success' },
    { label: 'Public Visibility', value: 100, suffix: '%', icon: Users, color: 'text-info' },
  ];

  if (loading) return <PageLoader label="Loading public data..." />;

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-8">
      <header className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Where Your Taxes Go</h1>
        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
          An open, transparent record of all public fund movements. 
          Powered by real-time blockchain tracking for ultimate accountability.
        </p>
        <div className="flex justify-center gap-4 pt-4">
           <div className="bg-success/10 border border-success/20 px-4 py-2 rounded-full flex items-center gap-2">
             <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
             <span className="text-xs font-bold text-success uppercase tracking-widest">Live Ledger Connected</span>
           </div>
           <div className="bg-accent/10 border border-accent/20 px-4 py-2 rounded-full flex items-center gap-2">
             <span className="text-xs font-bold text-accent uppercase tracking-widest">Last Sync: {lastSync ? new Date(lastSync).toLocaleTimeString() : 'N/A'}</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {publicStats.map((stat, i) => (
          <div key={i} className="bg-bg-card p-6 rounded-2xl border border-white/5 space-y-4">
             <div className={cn("w-12 h-12 rounded-xl bg-bg-surface flex items-center justify-center border border-border", stat.color)}>
               <stat.icon size={24} />
             </div>
             <div>
               <p className="text-text-muted text-sm font-medium">{stat.label}</p>
               <h3 className="text-3xl font-bold mt-1">₹{stat.value}{stat.suffix}</h3>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Fund Distribution by Ministry" className="h-[450px]">
             <div className="h-full w-full py-4">
               <ResponsiveContainer width="100%" height="85%">
                 <Treemap
                   data={treemapData}
                   dataKey="size"
                   stroke="#0B0F1A"
                   fill="#2563EB"
                 >
                   <Tooltip 
                     contentStyle={{ backgroundColor: '#131929', border: '1px solid #2A3347' }}
                     formatter={(value) => [`Allocated: ${formatCurrency(value as number)}`]}
                   />
                 </Treemap>
               </ResponsiveContainer>
               <div className="flex gap-4 items-center justify-center text-xs text-text-muted mt-4">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-accent rounded"></div><span>Higher Allocation</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-accent/40 rounded"></div><span>Lower Allocation</span></div>
               </div>
             </div>
          </Card>
        </div>

        <div className="space-y-6">
           <Card title="Live Payout Feed" className="h-[450px] flex flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto pr-2 mt-4">
                 {treemapData.slice(0, 5).map((item: any, i: number) => (
                   <div key={i} className="p-4 bg-bg-surface border border-border rounded-xl group hover:border-accent/40 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-[10px] font-bold text-accent uppercase">{item.name}</span>
                         <span className="text-[10px] text-text-muted">14m ago</span>
                      </div>
                      <p className="text-sm font-medium">Budget utilization update</p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                        <span className="text-sm font-bold font-mono">{formatCurrency(Math.round(item.spent))}</span>
                        <Badge variant="success">Verified</Badge>
                      </div>
                   </div>
                 ))}
              </div>
              <Button variant="ghost" className="mt-4 w-full">View Global Ledger <ArrowRight size={16} /></Button>
           </Card>
        </div>
      </div>

      <section className="space-y-8 bg-bg-surface/30 p-10 rounded-3xl border border-border">
         <div className="max-w-2xl">
            <h2 className="text-2xl font-bold">Why Transparency Matters</h2>
            <p className="text-text-secondary mt-2">
              VeriFund uses Algorand's public blockchain to create an unchangeable record of every rupee. 
              This prevents corruption, ensures money reaches its destination, and empowers citizens to hold 
              authorities accountable.
            </p>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
               <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent"><ShieldCheck size={20}/></div>
               <h4 className="font-bold">Tamper Proof</h4>
               <p className="text-sm text-text-muted leading-relaxed">Once a transaction is confirmed by the network, it cannot be edited or deleted by anyone.</p>
            </div>
            <div className="space-y-3">
               <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success"><Search size={20}/></div>
               <h4 className="font-bold">Fully Traceable</h4>
               <p className="text-sm text-text-muted leading-relaxed">Citizens can trace any project fund back to the initial treasury allocation.</p>
            </div>
            <div className="space-y-3">
               <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center text-info"><Heart size={20}/></div>
               <h4 className="font-bold">Impact Oriented</h4>
               <p className="text-sm text-text-muted leading-relaxed">Detailed audit reports show how funds are directly impacting ground-level citizen services.</p>
            </div>
         </div>
      </section>

      <footer className="text-center py-10 border-t border-border text-text-muted text-sm space-y-4">
         <p>© 2026 Ministry of Finance Portfolio — Transparency Initiative</p>
         <div className="flex justify-center gap-6">
            <a href="#" className="hover:text-accent">Ledger Proofs</a>
            <a href="#" className="hover:text-accent">Methodology</a>
            <a href="#" className="hover:text-accent">Public API</a>
            <a href="#" className="hover:text-accent">Contact Ombudsman</a>
         </div>
         <p className="text-[10px] font-mono opacity-50">Chain Integrity Status: 0x8a2...3c91 [SYNCED]</p>
      </footer>
    </div>
  );
}
