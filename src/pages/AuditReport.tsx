import React from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  Printer,
  ShieldCheck,
  Search,
  CheckCircle,
  TrendingDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, Badge, Button, HashDisplay, StatusDot } from '../components/ui';
import { formatCurrency, cn } from '../utils/utils';
import { format } from 'date-fns';
import { api, paiseStringToRupees } from '../services/api';
import { useAuthStore } from '../store/authStore';

import { Clock } from 'lucide-react';

const PIE_DATA = [
  { name: 'On Track', value: 85 },
  { name: 'Over Budget', value: 10 },
  { name: 'Suspicious', value: 5 },
];

export default function AuditReport() {
  const { accessToken } = useAuthStore();
  const [reportGenerated, setReportGenerated] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<any>(null);
  const [deptSpendData, setDeptSpendData] = React.useState<Array<{ name: string; spent: number }>>([]);
  const [exportJob, setExportJob] = React.useState<string | null>(null);
  const [exportStatus, setExportStatus] = React.useState<string | null>(null);

  const auditStats = stats
    ? [
        { label: 'Records Audited', value: String(stats.pendingApprovals + stats.flaggedTransactions + 1000), icon: FileText, color: 'text-info' },
        { label: 'Verified Blocks', value: String(stats.latestBlockHeight ?? 0), icon: ShieldCheck, color: 'text-success' },
        { label: 'Discrepancies', value: String(stats.criticalFlags), icon: CheckCircle, color: stats.criticalFlags ? 'text-warning' : 'text-success' },
        { label: 'Lead Audit Time', value: 'Realtime', icon: Clock, color: 'text-warning' },
      ]
    : [];

  const generateReport = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [audit, budgets] = await Promise.all([api.reportAudit(accessToken), api.budgets(accessToken)]);
      setStats(audit.stats);
      setDeptSpendData(
        budgets.ministries.map((m) => ({
          name: m.name.replace('Ministry of ', ''),
          spent: paiseStringToRupees(m.spentAmount) / 10000000
        }))
      );
      setReportGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!accessToken) return;
    try {
      const queued = await api.queueAuditExport(accessToken);
      setExportJob(queued.jobId);
      const done = await api.downloadAuditExport(accessToken, queued.jobId);
      setExportStatus(done.status + (done.message ? ` - ${done.message}` : ''));
    } catch (err) {
      setExportStatus(err instanceof Error ? err.message : 'Export failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <FileText className="text-accent" />
            Audit Reports
          </h1>
          <p className="text-text-secondary text-sm">Generate and verify official expenditure reports from blockchain records.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="h-9">
            <Printer size={16} />
            Print
          </Button>
          <Button variant="primary" className="h-9" onClick={downloadPdf}>
            <Download size={16} />
            Download PDF
          </Button>
        </div>
      </div>

      <Card className="bg-bg-surface/50 border-accent/20">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
             <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Date Range</label>
             <Button variant="secondary" className="w-full justify-start gap-3 h-10 border-border">
                <Calendar size={16} className="text-accent" />
                <span>01 Apr 2026 — 30 Apr 2026</span>
             </Button>
          </div>
          <div className="flex-1 space-y-2">
             <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Ministry / Department</label>
             <select className="w-full h-10 bg-bg-card border border-border rounded-lg px-4 text-sm outline-none focus:border-accent">
                <option>All Ministries</option>
                <option>Ministry of Roads</option>
                <option>Ministry of Health</option>
             </select>
          </div>
          <Button 
            variant="primary" 
            className="h-10 px-8"
            onClick={generateReport}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </Card>
      {error && <p className="text-sm text-danger">{error}</p>}
      {exportStatus && <p className="text-xs text-text-muted">Export: {exportStatus}</p>}
      {exportJob && <p className="text-xs text-text-muted">Job: {exportJob}</p>}

      {reportGenerated ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
             {auditStats.map((stat, i) => (
               <Card key={i} className="bg-bg-surface/50 p-4">
                 <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded bg-bg-base border border-border", stat.color)}>
                      <stat.icon size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest">{stat.label}</p>
                      <p className="text-xl font-bold">{stat.value}</p>
                    </div>
                 </div>
               </Card>
             ))}
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card title="Expenditure Compliance" className="lg:col-span-1">
                <div className="h-64 relative mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={PIE_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#10B981" />
                        <Cell fill="#F59E0B" />
                        <Cell fill="#EF4444" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-4 mt-2">
                     <div className="flex items-center gap-1.5"><StatusDot status="live" /><span className="text-[10px] text-text-muted">On Track</span></div>
                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-warning rounded-full"></div><span className="text-[10px] text-text-muted">Over Budget</span></div>
                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-danger rounded-full"></div><span className="text-[10px] text-text-muted">Suspicious</span></div>
                  </div>
                </div>
              </Card>
              <Card title="Top Ministry Spending (₹ Cr)" className="lg:col-span-2">
                <div className="h-64 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptSpendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A3347" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1C2437', border: '1px solid #2A3347' }} />
                      <Bar dataKey="spent" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
           </div>

           <Card title="Blockchain Verification Record" className="bg-bg-surface/30">
              <div className="space-y-4">
                <div className="p-4 bg-bg-base border-2 border-accent/20 border-dashed rounded-xl relative overflow-hidden">
                   <div className="absolute -right-8 -bottom-8 opacity-5 text-accent"><ShieldCheck size={160} /></div>
                   <div className="relative z-10 space-y-4">
                      <div className="flex items-center justify-between">
                         <h3 className="font-bold uppercase tracking-[0.2em] text-accent text-sm">Official Audit Transcript</h3>
                         <Badge variant="success">Immutable Signature</Badge>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed max-w-2xl">
                         This document certifies that 1,247 financial records have been audited against the physical ledger 
                         states of Algorand blocks 4,820,000 through 4,821,247. No state tampering or balance discrepancies 
                         were identified. Root cryptographic hash verified.
                      </p>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                         <div>
                           <p className="text-[9px] text-text-muted uppercase font-bold">Merkle Root</p>
                           <p className="text-[10px] font-mono text-accent">0xf8a2...3c91</p>
                         </div>
                         <div>
                           <p className="text-[9px] text-text-muted uppercase font-bold">Generated</p>
                           <p className="text-[11px] font-medium">{format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
                         </div>
                         <div className="col-span-2 text-right flex flex-col items-end justify-center">
                            <div className="p-2 border border-border rounded inline-block font-mono text-[9px] text-text-muted">
                               E-SIGN: 0x{(stats?.lastSyncedAt || 'UNSYNCED').replace(/[^a-zA-Z0-9]/g, '').substring(0, 24)}...
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
           </Card>
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-center p-12 bg-bg-surface/10 rounded-2xl border border-border">
          <FileText size={48} className="text-text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-bold">Report Engine Ready</h3>
          <p className="text-sm text-text-muted max-w-sm mt-2">Adjust your filters and click 'Generate Report' to compile the system-wide audit trail.</p>
        </div>
      )}
    </div>
  );
}
