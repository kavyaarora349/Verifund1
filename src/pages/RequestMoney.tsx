import React from "react";
import { HandCoins, Send } from "lucide-react";
import { Button, Card, Badge, PageLoader } from "../components/ui";
import { useAuthStore } from "../store/authStore";
import { api, type AllocationRequest } from "../services/api";

type RequestFormState = {
  requestedAlgoAmount: number;
  projectReason: string;
  requestTarget: "ADMIN" | "FINANCE_OFFICER" | "DEPT_HEAD";
};

const VENDOR_WALLET_ADDRESS = "44FUIH6EUR4UAGHSDEW7BIIFOSSYZS3BYKX7AFA773DAFXQTCHSBM6DSHQ";
const NHAI_WALLET_ADDRESS = "4BU5IA4XCXUQFVA6E4HYQCAZC2IRXY2S4D2ZETQFQYIPVKIGBLXRPE6EHA";
const CFO_ADMIN_WALLET_ADDRESS = "YIXSEF2QIM7IX46FCEWN2MAH4AFILI6AKPANUXLUO6QV6L44CHL5YFVCUQ";

const defaultForm: RequestFormState = {
  requestedAlgoAmount: 10,
  projectReason: "",
  requestTarget: "FINANCE_OFFICER"
};

export default function RequestMoney() {
  const { accessToken, activeRole } = useAuthStore();
  const isDeptHead = activeRole === "Dept Head";
  const isVendor = activeRole === "Vendor";
  const canDirectAllocate = activeRole === "Admin" || activeRole === "Finance Officer";

  const [form, setForm] = React.useState<RequestFormState>(defaultForm);
  const [rows, setRows] = React.useState<AllocationRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const requestTargetOptions = React.useMemo(() => {
    if (isDeptHead) {
      return [
        { value: "FINANCE_OFFICER", label: "Requesting from CFO" },
        { value: "ADMIN", label: "Requesting from Admin" }
      ] as const;
    }
    return [
      { value: "FINANCE_OFFICER", label: "Requesting from CFO" },
      { value: "ADMIN", label: "Requesting from Admin" },
      { value: "DEPT_HEAD", label: "Requesting from Dept Head" }
    ] as const;
  }, [isDeptHead]);

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
        setError(err instanceof Error ? err.message : "Failed to load requests");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [accessToken, loadRows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    if (!Number.isFinite(form.requestedAlgoAmount) || form.requestedAlgoAmount <= 0) {
      setError("Requested ALGO amount must be greater than 0.");
      setSaving(false);
      return;
    }
    if (form.projectReason.trim().length < 10) {
      setError("Please provide a project reason with at least 10 characters.");
      setSaving(false);
      return;
    }

    try {
      if (isDeptHead) {
        const targetWallet =
          form.requestTarget === "DEPT_HEAD" ? NHAI_WALLET_ADDRESS : CFO_ADMIN_WALLET_ADDRESS;
        const res = await api.createAllocationRequest(accessToken, {
          beneficiaryWalletAddress: NHAI_WALLET_ADDRESS,
          requestedAlgoAmount: form.requestedAlgoAmount,
          projectReason: `${form.projectReason.trim()} | RequestedFrom=${form.requestTarget} (${targetWallet})`,
          requestTargetRole: form.requestTarget,
          ministryCode: "MOR",
          ministryName: "Ministry of Roads",
          ministryAllocatedRupees: 1000000,
          departmentCode: "NHAI",
          departmentName: "NHAI",
          departmentAllocatedRupees: Math.round(form.requestedAlgoAmount)
        });
        setMessage(res.message);
      } else if (isVendor) {
        const targetWallet =
          form.requestTarget === "DEPT_HEAD" ? NHAI_WALLET_ADDRESS : CFO_ADMIN_WALLET_ADDRESS;
        const res = await api.createAllocationRequest(accessToken, {
          beneficiaryWalletAddress: VENDOR_WALLET_ADDRESS,
          requestedAlgoAmount: form.requestedAlgoAmount,
          projectReason: `${form.projectReason.trim()} | RequestedFrom=${form.requestTarget} (${targetWallet})`,
          requestTargetRole: form.requestTarget,
          ministryCode: "MOR",
          ministryName: "Ministry of Roads",
          ministryAllocatedRupees: 1000000,
          departmentCode: "NHAI",
          departmentName: "NHAI",
          departmentAllocatedRupees: Math.round(form.requestedAlgoAmount)
        });
        setMessage(res.message);
      } else if (canDirectAllocate) {
        await api.allocateBudget(accessToken, {
          ministryCode: "MOR",
          ministryName: "Ministry of Roads",
          ministryAllocatedRupees: 1000000,
          departmentCode: "NHAI",
          departmentName: "NHAI",
          departmentAllocatedRupees: Math.round(form.requestedAlgoAmount)
        });
        setMessage("Direct allocation applied successfully.");
      } else {
        setError("You are not authorized for this action.");
      }
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="Loading requests..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HandCoins className="text-accent" />
          Request Money
        </h1>
        <p className="text-text-secondary text-sm">
          Enter ALGO amount + project reason. Dept Head requests are paid on TestNet after Admin and CFO approval.
        </p>
      </div>

      <Card title={isDeptHead ? "Create Fund Request" : "Direct Allocation / Request Form"}>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleSubmit}>
          <div className="md:col-span-2 rounded-lg border border-border bg-bg-surface px-3 py-3 space-y-1">
            <p className="text-[11px] uppercase tracking-widest text-text-muted font-bold">Payout Details</p>
            <p className="text-xs text-text-muted">
              Vendor wallet (fixed): <span className="text-text-primary font-mono">{VENDOR_WALLET_ADDRESS}</span>
            </p>
            <p className="text-xs text-text-muted">
              Dept NHAI wallet (fixed): <span className="text-text-primary font-mono">{NHAI_WALLET_ADDRESS}</span>
            </p>
            <p className="text-xs text-text-muted">
              CFO/Admin wallet (fixed): <span className="text-text-primary font-mono">{CFO_ADMIN_WALLET_ADDRESS}</span>
            </p>
          </div>

          <input
            type="number"
            step="0.000001"
            min="0.000001"
            className="bg-bg-surface border border-border rounded px-3 py-2 text-sm"
            placeholder="How much ALGO needed?"
            value={form.requestedAlgoAmount}
            onChange={(e)=>setForm((f)=>({...f,requestedAlgoAmount:Number(e.target.value)}))}
          />
          <select
            className="bg-bg-surface border border-border rounded px-3 py-2 text-sm"
            value={form.requestTarget}
            onChange={(e) => setForm((f) => ({ ...f, requestTarget: e.target.value as "ADMIN" | "FINANCE_OFFICER" | "DEPT_HEAD" }))}
          >
            {requestTargetOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <textarea
            className="md:col-span-2 bg-bg-surface border border-border rounded px-3 py-2 text-sm min-h-24"
            placeholder="Reason for funds / project details"
            value={form.projectReason}
            onChange={(e)=>setForm((f)=>({...f,projectReason:e.target.value}))}
          />

          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" disabled={saving}>
              <Send size={16} />
              {saving ? "Submitting..." : (isDeptHead || isVendor) ? "Submit Money Request" : "Apply Direct Allocation"}
            </Button>
          </div>
        </form>
      </Card>

      {message && <p className="text-sm text-success">{message}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      <Card title={isDeptHead ? "My Requests" : "Recent Requests"}>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="p-3 border border-border rounded bg-bg-surface flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{r.departmentName} ({r.departmentCode})</p>
                <p className="text-xs text-text-muted">
                  Requested by {r.requestedBy.name} · {Number(r.requestedAlgoAmount) / 1_000_000} ALGO
                </p>
                <p className="text-xs text-text-muted">Wallet: {r.beneficiaryWalletAddress}</p>
                <p className="text-xs text-text-muted">Reason: {r.projectReason.split(" | RequestedFrom=")[0]}</p>
              </div>
              <Badge variant={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}>
                {r.status}
              </Badge>
            </div>
          ))}
          {!rows.length && <p className="text-xs text-text-muted">No requests found.</p>}
        </div>
      </Card>
    </div>
  );
}
