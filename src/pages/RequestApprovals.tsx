import React from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, PageLoader } from "../components/ui";
import { useAuthStore } from "../store/authStore";
import { api, paiseStringToRupees, type AllocationRequest } from "../services/api";

export default function RequestApprovals() {
  const { accessToken, activeRole, walletAddress } = useAuthStore();
  const [rows, setRows] = React.useState<AllocationRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [approvingId, setApprovingId] = React.useState<string | null>(null);
  const [approvalSignature, setApprovalSignature] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadRows = React.useCallback(async () => {
    if (!accessToken) return;
    const res = await api.allocationRequests(accessToken);
    setRows(res.data);
  }, [accessToken]);

  React.useEffect(() => {
    if (!accessToken) return;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        await loadRows();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load approvals");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [accessToken, loadRows]);

  const handleApprove = async (requestId: string) => {
    if (!accessToken) return;
    setApprovingId(requestId);
    setError(null);
    setMessage(null);
    try {
      const signature = approvalSignature.trim() || `${walletAddress || "WALLET"}:${new Date().toISOString()}`;
      const res = await api.approveAllocationRequest(accessToken, requestId, signature);
      setMessage(res.message);
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) return <PageLoader label="Loading approvals..." />;

  const roleKey = activeRole === "Admin" ? "ADMIN" : "FINANCE_OFFICER";
  const pendingForMe = rows.filter((r) => {
    if (r.status !== "PENDING") return false;
    const myApproval = r.approvals.find((a) => a.approver.role === roleKey);
    return myApproval?.status !== "SIGNED";
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="text-accent" />
          Request Approvals
        </h1>
        <p className="text-text-secondary text-sm">
          Dept Head requests are finalized only after both CFO and Admin approvals.
        </p>
      </div>

      <Card title="Sign Pending Requests">
        <div className="space-y-3">
          <input
            value={approvalSignature}
            onChange={(e) => setApprovalSignature(e.target.value)}
            placeholder="Pera signature (optional dev field)"
            className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm"
          />
          {pendingForMe.map((r) => (
            <div key={r.id} className="p-3 border border-border rounded bg-bg-surface flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{r.departmentName} ({r.departmentCode})</p>
                <p className="text-xs text-text-muted">
                  Requested by {r.requestedBy.name} · Amount {paiseStringToRupees(r.departmentAllocatedAmount).toLocaleString("en-IN")}
                </p>
              </div>
              <Button disabled={approvingId === r.id} onClick={() => handleApprove(r.id)}>
                <CheckCircle2 size={16} />
                {approvingId === r.id ? "Approving..." : "Approve Request"}
              </Button>
            </div>
          ))}
          {!pendingForMe.length && <p className="text-xs text-text-muted">No requests waiting for your signature.</p>}
        </div>
      </Card>

      {message && <p className="text-sm text-success">{message}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      <Card title="All Requests (Your Scope)">
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="p-3 border border-border rounded bg-bg-surface flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{r.departmentName}</p>
                <p className="text-xs text-text-muted">{new Date(r.createdAt).toLocaleString()}</p>
              </div>
              <Badge variant={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}>
                {r.status}
              </Badge>
            </div>
          ))}
          {!rows.length && <p className="text-xs text-text-muted">No requests available.</p>}
        </div>
      </Card>
    </div>
  );
}
