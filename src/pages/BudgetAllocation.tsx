import React from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  PieChart as PieIcon,
  Plus,
  ArrowRight
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { Card, Badge, Button, PageLoader } from '../components/ui';
import { formatCurrency, cn } from '../utils/utils';
import { api, paiseStringToRupees, type AllocationRequest } from '../services/api';
import { useAuthStore } from '../store/authStore';

type BudgetNode = {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  children?: BudgetNode[];
};

export default function BudgetAllocation() {
  const { accessToken, activeRole, walletAddress } = useAuthStore();
  const [root, setRoot] = React.useState<BudgetNode | null>(null);
  const [selectedNode, setSelectedNode] = React.useState<BudgetNode | null>(null);
  const [expanded, setExpanded] = React.useState<string[]>(['central']);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showAllocateForm, setShowAllocateForm] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [requestRows, setRequestRows] = React.useState<AllocationRequest[]>([]);
  const [requestMessage, setRequestMessage] = React.useState<string | null>(null);
  const [approvalSignature, setApprovalSignature] = React.useState('');
  const [approvingId, setApprovingId] = React.useState<string | null>(null);
  const [allocateForm, setAllocateForm] = React.useState({
    ministryCode: 'MOR',
    ministryName: 'Ministry of Roads',
    ministryAllocatedRupees: 1000000,
    departmentCode: 'NEW-DEPT',
    departmentName: 'New Department',
    departmentAllocatedRupees: 100000
  });

  const canAllocate = activeRole === 'Admin' || activeRole === 'Finance Officer';
  const isDeptHead = activeRole === 'Dept Head';
  const canApproveRequests = activeRole === 'Admin' || activeRole === 'Finance Officer';
  const refreshBudgets = React.useCallback(async () => {
    if (!accessToken) return;
    const tree = await api.budgets(accessToken);
    const mapped: BudgetNode = {
      id: "central",
      name: "Central Government",
      allocated: paiseStringToRupees(tree.totalAllocated),
      spent: paiseStringToRupees(tree.totalDisbursed),
      children: tree.ministries.map((m) => ({
        id: m.id,
        name: m.name,
        allocated: paiseStringToRupees(m.allocatedAmount),
        spent: paiseStringToRupees(m.spentAmount),
        children: m.departments.map((d) => ({
          id: d.id,
          name: d.name,
          allocated: paiseStringToRupees(d.allocatedAmount),
          spent: paiseStringToRupees(d.spentAmount)
        }))
      }))
    };
    setRoot(mapped);
    setSelectedNode((prev) => {
      if (!prev) return mapped;
      const findNode = (node: BudgetNode): BudgetNode | null => {
        if (node.id === prev.id) return node;
        for (const child of node.children ?? []) {
          const found = findNode(child);
          if (found) return found;
        }
        return null;
      };
      return findNode(mapped) ?? mapped;
    });
  }, [accessToken]);

  const refreshAllocationRequests = React.useCallback(async () => {
    if (!accessToken) return;
    const rows = await api.allocationRequests(accessToken);
    setRequestRows(rows.data);
  }, [accessToken]);

  React.useEffect(() => {
    if (!accessToken) return;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        await refreshBudgets();
        await refreshAllocationRequests();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load budgets");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [accessToken, refreshBudgets, refreshAllocationRequests]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const renderTree = (node: BudgetNode, depth = 0) => {
    const isExpanded = expanded.includes(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const utilization = (node.spent / node.allocated) * 100;

    return (
      <div key={node.id} className="space-y-1">
        <div 
          onClick={() => setSelectedNode(node)}
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group",
            selectedNode?.id === node.id ? "bg-accent/10 border border-accent/20" : "hover:bg-bg-hover"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {hasChildren ? (
            <button onClick={(e) => toggleExpand(node.id, e)} className="text-text-muted hover:text-text-primary">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : <div className="w-3.5"></div>}
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{node.name}</span>
              <span className="text-xs font-mono text-text-muted">{formatCurrency(node.allocated)}</span>
            </div>
            <div className="mt-1 h-1 w-full bg-border rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  utilization > 90 ? "bg-danger" : utilization > 70 ? "bg-warning" : "bg-success"
                )}
                style={{ width: `${utilization}%` }}
              ></div>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {node.children?.map(child => renderTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <PageLoader label="Loading budgets..." />;
  if (error) return <div className="text-sm text-danger">{error}</div>;
  if (!root || !selectedNode) return <div className="text-sm text-text-muted">No budget data</div>;

  const utilizationData = [
    { name: 'Spent', value: selectedNode.spent },
    { name: 'Remaining', value: Math.max(selectedNode.allocated - selectedNode.spent, 0) },
  ];

  const subDeptData = selectedNode.children?.map(c => ({
    name: c.name,
    spent: c.spent / 10000000,
    allocated: c.allocated / 10000000
  })) || [];

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    setRequestMessage(null);
    try {
      const payload = {
        ...allocateForm,
        ministryAllocatedRupees: Number(allocateForm.ministryAllocatedRupees),
        departmentAllocatedRupees: Number(allocateForm.departmentAllocatedRupees)
      };

      if (isDeptHead) {
        if (!walletAddress || walletAddress === 'N/A') {
          throw new Error("Connect wallet first, then use Request Money page for ALGO requests.");
        }
        const res = await api.createAllocationRequest(accessToken, {
          ...payload,
          beneficiaryWalletAddress: walletAddress,
          requestedAlgoAmount: Number(allocateForm.departmentAllocatedRupees),
          projectReason: 'Requested via budget allocation page'
        });
        setRequestMessage(res.message);
      } else {
        await api.allocateBudget(accessToken, payload);
        setRequestMessage("Allocation applied successfully.");
      }
      await refreshBudgets();
      await refreshAllocationRequests();
      setShowAllocateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Allocation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    if (!accessToken) return;
    setApprovingId(requestId);
    setError(null);
    setRequestMessage(null);
    try {
      const signature =
        approvalSignature.trim() ||
        `${walletAddress || "WALLET"}:${new Date().toISOString()}`;
      const res = await api.approveAllocationRequest(accessToken, requestId, signature);
      setRequestMessage(res.message);
      await refreshBudgets();
      await refreshAllocationRequests();
      setApprovalSignature('');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <PieIcon className="text-accent" />
            Budget Allocation
          </h1>
          <p className="text-text-secondary text-sm">Hierarchical breakdown of government treasury distribution.</p>
        </div>
        <Button variant="primary" onClick={() => setShowAllocateForm((v) => !v)} disabled={!(canAllocate || isDeptHead)}>
          <Plus size={18} />
          {isDeptHead ? 'Request Allocation' : canAllocate ? 'New Sub-allocation' : 'Allocation (Restricted)'}
        </Button>
      </div>
      {showAllocateForm && (canAllocate || isDeptHead) && (
        <Card title="Create / Update Allocation">
          <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleAllocate}>
            <input className="bg-bg-surface border border-border rounded px-3 py-2 text-sm" placeholder="Ministry Code" value={allocateForm.ministryCode} onChange={(e)=>setAllocateForm((f)=>({...f,ministryCode:e.target.value}))}/>
            <input className="bg-bg-surface border border-border rounded px-3 py-2 text-sm" placeholder="Ministry Name" value={allocateForm.ministryName} onChange={(e)=>setAllocateForm((f)=>({...f,ministryName:e.target.value}))}/>
            <input type="number" className="bg-bg-surface border border-border rounded px-3 py-2 text-sm" placeholder="Ministry Allocation (Rupees)" value={allocateForm.ministryAllocatedRupees} onChange={(e)=>setAllocateForm((f)=>({...f,ministryAllocatedRupees:Number(e.target.value)}))}/>
            <input className="bg-bg-surface border border-border rounded px-3 py-2 text-sm" placeholder="Department Code" value={allocateForm.departmentCode} onChange={(e)=>setAllocateForm((f)=>({...f,departmentCode:e.target.value}))}/>
            <input className="bg-bg-surface border border-border rounded px-3 py-2 text-sm" placeholder="Department Name" value={allocateForm.departmentName} onChange={(e)=>setAllocateForm((f)=>({...f,departmentName:e.target.value}))}/>
            <input type="number" className="bg-bg-surface border border-border rounded px-3 py-2 text-sm" placeholder="Department Allocation (Rupees)" value={allocateForm.departmentAllocatedRupees} onChange={(e)=>setAllocateForm((f)=>({...f,departmentAllocatedRupees:Number(e.target.value)}))}/>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : isDeptHead ? "Submit Request to Admin + CFO" : "Save Allocation"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowAllocateForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}
      {requestMessage && <p className="text-sm text-success">{requestMessage}</p>}
      {canApproveRequests && (
        <Card title="Pending Allocation Requests (Dept Heads)">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={approvalSignature}
                onChange={(e) => setApprovalSignature(e.target.value)}
                placeholder="Pera signature (optional dev field)"
                className="flex-1 bg-bg-surface border border-border rounded px-3 py-2 text-sm"
              />
            </div>
            {requestRows.filter((r) => r.status === 'PENDING').map((r) => {
              const myApproval = r.approvals.find((a) => a.approver.role === (activeRole === 'Admin' ? 'ADMIN' : 'FINANCE_OFFICER'));
              const mineSigned = myApproval?.status === 'SIGNED';
              return (
                <div key={r.id} className="p-3 border border-border rounded bg-bg-surface flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{r.departmentName} ({r.departmentCode})</p>
                    <p className="text-xs text-text-muted">
                      Requested by {r.requestedBy.name} · Dept ₹{Number(paiseStringToRupees(r.departmentAllocatedAmount)).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={mineSigned ? 'success' : 'warning'}>{mineSigned ? 'Signed' : 'Awaiting your signature'}</Badge>
                    <Button disabled={mineSigned || approvingId === r.id} onClick={() => handleApproveRequest(r.id)}>
                      {approvingId === r.id ? 'Approving...' : 'Approve from Pera'}
                    </Button>
                  </div>
                </div>
              );
            })}
            {!requestRows.filter((r) => r.status === 'PENDING').length && (
              <p className="text-xs text-text-muted">No pending requests.</p>
            )}
          </div>
        </Card>
      )}
      {isDeptHead && (
        <Card title="My Allocation Requests">
          <div className="space-y-2">
            {requestRows.map((r) => (
              <div key={r.id} className="p-3 border border-border rounded bg-bg-surface flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{r.departmentName}</p>
                  <p className="text-xs text-text-muted">
                    {new Date(r.createdAt).toLocaleString()} · Ministry {r.ministryCode}
                  </p>
                </div>
                <Badge variant={r.status === 'APPROVED' ? 'success' : r.status === 'REJECTED' ? 'danger' : 'warning'}>
                  {r.status}
                </Badge>
              </div>
            ))}
            {!requestRows.length && <p className="text-xs text-text-muted">No requests yet.</p>}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-220px)]">
        {/* Left Panel - Tree */}
        <Card title="Allocation Hierarchy" className="lg:col-span-2 overflow-y-auto">
          <div className="space-y-2 mt-4">
            {renderTree(root)}
          </div>
        </Card>

        {/* Right Panel - Stats */}
        <div className="lg:col-span-3 space-y-6 overflow-y-auto pr-2">
          <Card title={`${selectedNode.name} Detail`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-4">
              <div className="h-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={utilizationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#2A3347" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold">{Math.round((selectedNode.spent / selectedNode.allocated) * 100)}%</span>
                  <span className="text-[10px] text-text-muted uppercase">Utilized</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-xs text-text-muted">Total Allocated</span>
                  <span className="text-sm font-bold font-mono">{formatCurrency(selectedNode.allocated)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-xs text-text-muted">Total Spent</span>
                  <span className="text-sm font-bold font-mono text-success">{formatCurrency(selectedNode.spent)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-xs text-text-muted">Remaining</span>
                  <span className="text-sm font-bold font-mono">{formatCurrency(selectedNode.allocated - selectedNode.spent)}</span>
                </div>
              </div>
            </div>
          </Card>

          {subDeptData.length > 0 && (
            <Card title="Sub-Allocation Breakdown (₹ Cr)">
              <div className="h-64 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subDeptData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A3347" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#1C2437', border: '1px solid #2A3347' }} />
                    <Bar dataKey="spent" fill="#10B981" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="allocated" fill="#2563EB" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Card title="Recent Transactions for Dept">
            <p className="text-xs text-text-muted mt-4">
              Open <span className="text-text-primary">Ledger Explorer</span> for full transaction-level details. 
              Budget view is now sourced live from backend hierarchy data.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
