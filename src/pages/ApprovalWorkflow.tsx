import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  ArrowRight,
  ShieldCheck,
  User,
  Fingerprint
} from 'lucide-react';
import { Card, Badge, Button, HashDisplay, PageLoader } from '../components/ui';
import { formatCurrency, cn } from '../utils/utils';
import { format } from 'date-fns';
import { api, paiseStringToRupees, type AllocationRequest, type BackendTransaction } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { CheckSquare } from 'lucide-react';

export default function ApprovalWorkflow() {
  const { accessToken, activeRole, walletAddress } = useAuthStore();
  const [pendingQueue, setPendingQueue] = React.useState<BackendTransaction[]>([]);
  const [requestRows, setRequestRows] = React.useState<AllocationRequest[]>([]);
  const [selectedTxn, setSelectedTxn] = React.useState<BackendTransaction | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [requestMessage, setRequestMessage] = React.useState<string | null>(null);
  const [approvalSignature, setApprovalSignature] = React.useState('');
  const [approvingRequestId, setApprovingRequestId] = React.useState<string | null>(null);

  const canApproveBudgetRequests =
    activeRole === 'Admin' || activeRole === 'Finance Officer' || activeRole === 'Dept Head';

  const refreshQueue = React.useCallback(async () => {
    if (!accessToken) return;
    const queue = await api.approvals(accessToken);
    const rows = (queue.data as Array<{ transaction?: BackendTransaction }>).map((x) => x.transaction).filter(Boolean) as BackendTransaction[];
    setPendingQueue(rows);
    setSelectedTxn((prev) => prev && rows.find((r) => r.id === prev.id) ? rows.find((r) => r.id === prev.id)! : rows[0] ?? null);
  }, [accessToken]);

  const refreshBudgetRequests = React.useCallback(async () => {
    if (!accessToken || !canApproveBudgetRequests) {
      setRequestRows([]);
      return;
    }
    const rows = await api.allocationRequests(accessToken);
    setRequestRows(rows.data);
  }, [accessToken, canApproveBudgetRequests]);

  React.useEffect(() => {
    if (!accessToken) return;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        await refreshQueue();
        await refreshBudgetRequests();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load approvals");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [accessToken, refreshQueue, refreshBudgetRequests]);

  const handleApprove = async () => {
    if (!accessToken || !selectedTxn) return;
    await api.signApproval(accessToken, selectedTxn.id);
    await refreshQueue();
    await refreshBudgetRequests();
  };

  const handleReject = async () => {
    if (!accessToken || !selectedTxn) return;
    await api.rejectApproval(accessToken, selectedTxn.id, "Rejected from UI");
    await refreshQueue();
    await refreshBudgetRequests();
  };

  const handleApproveBudgetRequest = async (requestId: string) => {
    if (!accessToken || !canApproveBudgetRequests) return;
    setApprovingRequestId(requestId);
    setRequestMessage(null);
    setError(null);
    try {
      const signature = approvalSignature.trim() || `${walletAddress || "WALLET"}:${new Date().toISOString()}`;
      const res = await api.approveAllocationRequest(accessToken, requestId, signature);
      setRequestMessage(res.message);
      await refreshBudgetRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve budget request");
    } finally {
      setApprovingRequestId(null);
    }
  };

  if (loading) return <PageLoader label="Loading approvals..." />;
  if (error) return <div className="text-sm text-danger">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <CheckSquare className="text-accent" />
            Approvals
          </h1>
          <p className="text-text-secondary text-sm">Transaction approvals and money-request approvals in one place.</p>
        </div>
      </div>
      {canApproveBudgetRequests && (
        <Card title="Money Request Approvals">
          <div className="space-y-3">
            <input
              value={approvalSignature}
              onChange={(e) => setApprovalSignature(e.target.value)}
              placeholder="Pera signature (optional dev field)"
              className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm"
            />
            {requestRows
              .filter((r) => r.status === 'PENDING')
              .map((r) => {
                const myRole =
                  activeRole === 'Admin'
                    ? 'ADMIN'
                    : activeRole === 'Finance Officer'
                    ? 'FINANCE_OFFICER'
                    : 'DEPT_HEAD';
                const myApproval = r.approvals.find((a) => a.approver.role === myRole);
                const mineSigned = myApproval?.status === 'SIGNED';
                return (
                  <div key={r.id} className="p-3 border border-border rounded bg-bg-surface flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{r.departmentName} ({r.departmentCode})</p>
                      <p className="text-xs text-text-muted">
                        Requested by {r.requestedBy.name} · {Number(r.requestedAlgoAmount) / 1_000_000} ALGO
                      </p>
                      <p className="text-xs text-text-muted">Wallet: {r.beneficiaryWalletAddress}</p>
                      <p className="text-xs text-text-muted">Reason: {r.projectReason}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={mineSigned ? 'success' : 'warning'}>{mineSigned ? 'Signed' : 'Awaiting your signature'}</Badge>
                      <Button disabled={mineSigned || approvingRequestId === r.id} onClick={() => handleApproveBudgetRequest(r.id)}>
                        {approvingRequestId === r.id ? 'Approving...' : 'Approve Request'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            {!requestRows.filter((r) => r.status === 'PENDING').length && (
              <p className="text-xs text-text-muted">No pending budget requests.</p>
            )}
            {requestRows.filter((r) => r.status === 'APPROVED' && r.payoutTxId).slice(0, 3).map((r) => (
              <p key={r.id} className="text-xs text-success">
                Paid {r.departmentName}: {Number(r.requestedAlgoAmount) / 1_000_000} ALGO · Tx{" "}
                <a
                  href={`https://testnet.algoexplorer.io/tx/${r.payoutTxId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {r.payoutTxId?.slice(0, 14)}...
                </a>
              </p>
            ))}
          </div>
        </Card>
      )}
      {requestMessage && <p className="text-sm text-success">{requestMessage}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-220px)]">
        {/* Left Panel - Queue */}
        <Card title="Pending Requests" className="lg:col-span-2 overflow-y-auto">
          <div className="space-y-3 mt-4">
            {pendingQueue.map((txn) => (
              <div 
                key={txn.id}
                onClick={() => setSelectedTxn(txn)}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all hover:bg-bg-hover",
                  selectedTxn.id === txn.id ? "bg-bg-hover border-accent/50 shadow-lg shadow-accent/5" : "bg-bg-surface border-border"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{txn.department?.name ?? 'Department'}</span>
                  <Badge variant={txn.status === 'FLAGGED' ? 'danger' : 'warning'}>{txn.status.toLowerCase()}</Badge>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-sm font-bold">{txn.toName}</h3>
                    <p className="text-[10px] text-text-muted mt-1">{format(new Date(txn.createdAt), 'dd MMM, HH:mm')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono">{formatCurrency(paiseStringToRupees(txn.amount))}</p>
                    <div className="flex items-center gap-1 mt-1">
                       <span className="text-[10px] text-text-muted uppercase">Progress</span>
                       <div className="flex gap-0.5">
                         {[1,2,3,4].map(i => (
                           <div key={i} className={cn("w-2 h-1 rounded-full", i <= 2 ? "bg-accent" : "bg-border")}></div>
                         ))}
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Right Panel - Detail */}
        <div className="lg:col-span-3 space-y-6 overflow-y-auto pr-2">
          {selectedTxn ? (
            <>
              <Card title="Transaction Summary">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
                   <div>
                     <p className="text-[10px] text-text-muted uppercase font-bold">Amount</p>
                     <p className="text-xl font-bold font-mono tracking-tight">{formatCurrency(paiseStringToRupees(selectedTxn.amount))}</p>
                   </div>
                   <div>
                     <p className="text-[10px] text-text-muted uppercase font-bold">Ministry</p>
                     <p className="text-sm font-semibold">{selectedTxn.ministry}</p>
                   </div>
                   <div className="col-span-2">
                     <p className="text-[10px] text-text-muted uppercase font-bold">Hash</p>
                     <HashDisplay value={selectedTxn.blockchainTxHash || selectedTxn.id} full={selectedTxn.blockchainTxHash || selectedTxn.id} />
                   </div>
                </div>
                <div className="mt-6 p-4 bg-bg-surface rounded-lg border border-border flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-text-muted uppercase mb-1">To Vendor</p>
                    <p className="font-semibold text-accent">{selectedTxn.toName}</p>
                  </div>
                  <ArrowRight size={24} className="text-text-muted" />
                  <div className="text-right">
                    <p className="text-xs font-bold text-text-muted uppercase mb-1">From Source</p>
                    <p className="font-semibold">{selectedTxn.fromName}</p>
                  </div>
                </div>
              </Card>

              <Card title="Authorization Chain">
                <div className="space-y-6 mt-6 relative">
                  {/* Vertical line */}
                  <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border"></div>
                  
                  {(selectedTxn.approvals ?? []).map((approval, i) => (
                    <div key={i} className="flex gap-6 items-start relative z-10">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center border-2 border-bg-card",
                        approval.status === 'SIGNED' ? "bg-success text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-bg-card text-text-muted border-border"
                      )}>
                        {approval.status === 'SIGNED' ? <CheckCircle size={14} /> : <div className="w-1.5 h-1.5 bg-border rounded-full" />}
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-text-primary">{approval.role.replaceAll('_', ' ')}</p>
                          <p className="text-xs text-text-muted flex items-center gap-1">
                            <User size={12} />
                            {approval.user?.name ?? 'Approver'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-mono text-text-hash lowercase">{(approval.user?.walletAddress || 'N/A').substring(0, 12)}...</p>
                          {approval.signedAt ? (
                            <span className="text-[10px] text-success font-medium uppercase tracking-widest">{format(new Date(approval.signedAt), 'HH:mm')}</span>
                          ) : (
                            <span className="text-[10px] text-text-muted font-medium uppercase tracking-widest">Awaiting...</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Button variant="danger" className="h-12" onClick={handleReject}>
                   <XCircle size={18} />
                   Reject Request
                </Button>
                <Button variant="primary" className="h-12 shadow-lg shadow-accent/20" onClick={handleApprove}>
                   <ShieldCheck size={18} />
                   Sign & Approve
                </Button>
              </div>

              <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl flex items-start gap-4">
                 <Fingerprint size={32} className="text-accent shrink-0" />
                 <div>
                   <p className="text-xs font-bold text-accent uppercase mb-1">On-Chain Proof</p>
                   <p className="text-xs text-text-secondary leading-relaxed italic">
                     This transaction will be permanently anchored to ledger block #{selectedTxn.blockNumber ?? 'pending'}. Once signed, it cannot be modified or reversed by any authority.
                   </p>
                 </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-bg-surface/30 rounded-2xl border-2 border-dashed border-border">
              <div className="w-16 h-16 bg-bg-surface rounded-full flex items-center justify-center mb-4">
                <CheckSquare size={32} className="text-text-muted" />
              </div>
              <h3 className="text-lg font-bold">Select a request</h3>
              <p className="text-sm text-text-muted max-w-xs mt-2">Choose a pending transaction from the left queue to review authorization chain and sign.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
