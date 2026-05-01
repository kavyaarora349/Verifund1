import { Role } from "../types";
import { useAuthStore } from "../store/authStore";

function resolveApiBase(): string {
  const envBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (envBase) return envBase.replace(/\/+$/, "");

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:4000/api/v1";
    }

    const fallback = `${protocol}//${hostname}/api/v1`;
    // UI on Vercel/Netlify + API on Render: requests must use VITE_API_BASE_URL — same-origin /api/v1 does not exist.
    const staticHost =
      hostname.endsWith(".vercel.app") ||
      hostname.endsWith(".netlify.app") ||
      hostname.endsWith(".cloudflarepages.dev");
    if (import.meta.env.PROD && staticHost) {
      console.error(
        "[VeriFund] Set VITE_API_BASE_URL in your host (e.g. Vercel → Environment Variables) to your API root, e.g. https://YOUR-SERVICE.onrender.com/api/v1 — then Redeploy the frontend."
      );
    }
    return fallback;
  }

  return "http://localhost:4000/api/v1";
}

const API_BASE = resolveApiBase();

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type BackendUserRole = "ADMIN" | "AUDITOR" | "FINANCE_OFFICER" | "DEPT_HEAD" | "PUBLIC";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: BackendUserRole;
  department?: string | null;
  walletAddress?: string | null;
};

export type AuthLoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type DashboardStatsResponse = {
  totalAllocated: string;
  totalDisbursed: string;
  pendingApprovals: number;
  flaggedTransactions: number;
  criticalFlags: number;
  latestBlockHeight: number | null;
  lastSyncedAt: string | null;
  flagsByCategory: Record<string, number>;
};

export type BackendTransaction = {
  id: string;
  blockchainTxHash: string | null;
  blockNumber: number | null;
  blockHash: string | null;
  fromName: string;
  fromWallet: string;
  toName: string;
  toWallet: string;
  toType: string;
  amount: string;
  department?: { id: string; name: string } | null;
  ministry: string;
  createdAt: string;
  status: "PENDING" | "CONFIRMED" | "FLAGGED" | "REJECTED";
  flags?: Array<{ reason: string; category: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; aiScore: number }>;
  approvals?: Array<{
    role: BackendUserRole;
    status: "PENDING" | "SIGNED" | "REJECTED";
    signedAt?: string | null;
    user?: { name: string; walletAddress?: string | null };
  }>;
};

export type BudgetTreeResponse = {
  totalAllocated: string;
  totalDisbursed: string;
  utilizationPct: number;
  ministries: Array<{
    id: string;
    name: string;
    code: string;
    allocatedAmount: string;
    spentAmount: string;
    utilizationPct: number;
    departments: Array<{
      id: string;
      name: string;
      code: string;
      allocatedAmount: string;
      spentAmount: string;
      utilizationPct: number;
      pendingAmount: string;
      flaggedAmount: string;
    }>;
  }>;
};

export type BudgetAllocateInput = {
  ministryCode: string;
  ministryName: string;
  ministryAllocatedRupees: number;
  departmentCode: string;
  departmentName: string;
  departmentAllocatedRupees: number;
};

export type AllocationRequestInput = BudgetAllocateInput & {
  beneficiaryWalletAddress: string;
  requestedAlgoAmount: number;
  projectReason: string;
  requestTargetRole?: "ADMIN" | "FINANCE_OFFICER" | "DEPT_HEAD";
};

export type AllocationRequest = {
  id: string;
  beneficiaryWalletAddress: string;
  requestedAlgoAmount: string;
  projectReason: string;
  ministryCode: string;
  ministryName: string;
  ministryAllocatedAmount: string;
  departmentCode: string;
  departmentName: string;
  departmentAllocatedAmount: string;
  payoutTxId?: string | null;
  payoutRound?: number | null;
  payoutAt?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  requestedBy: {
    id: string;
    name: string;
    role: BackendUserRole;
    walletAddress?: string | null;
  };
  approvals: Array<{
    id: string;
    role: BackendUserRole;
    status: "PENDING" | "SIGNED" | "REJECTED";
    signature?: string | null;
    signedAt?: string | null;
    approver: {
      id: string;
      name: string;
      role: BackendUserRole;
      walletAddress?: string | null;
    };
  }>;
};

export type FlagFeedItem = {
  id: string;
  category: string;
  reason: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  aiScore: number;
  createdAt: string;
  transaction: {
    id: string;
    amount: string;
    toName: string;
    status: string;
  };
};

type RequestOptions = {
  method?: HttpMethod;
  token?: string | null;
  body?: unknown;
};

type CachedEntry = {
  expiresAt: number;
  data: unknown;
};

const GET_CACHE_TTL_MS = 30_000;
const GET_CACHE_PREFIX = "verifund:get:";
const getCache = new Map<string, CachedEntry>();
const inflightGet = new Map<string, Promise<unknown>>();

function isCacheablePath(path: string): boolean {
  // Keep fast cache for heavy read-mostly endpoints only.
  return (
    path.startsWith("/reports/dashboard/stats") ||
    path.startsWith("/budgets") ||
    path.startsWith("/public")
  );
}

function cacheKey(path: string, token?: string | null): string {
  const tokenPart = token ? token.slice(0, 16) : "public";
  return `${tokenPart}:${path}`;
}

function readCached<T>(key: string): T | null {
  const now = Date.now();
  const memory = getCache.get(key);
  if (memory && memory.expiresAt > now) return memory.data as T;

  try {
    const raw = localStorage.getItem(`${GET_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry;
    if (parsed.expiresAt <= now) {
      localStorage.removeItem(`${GET_CACHE_PREFIX}${key}`);
      return null;
    }
    getCache.set(key, parsed);
    return parsed.data as T;
  } catch {
    return null;
  }
}

function writeCached(key: string, data: unknown): void {
  const entry: CachedEntry = { expiresAt: Date.now() + GET_CACHE_TTL_MS, data };
  getCache.set(key, entry);
  try {
    localStorage.setItem(`${GET_CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // ignore storage quota errors
  }
}

function clearGetCache(): void {
  getCache.clear();
  inflightGet.clear();
  try {
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(GET_CACHE_PREFIX)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore storage access issues
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const shouldCache = method === "GET" && isCacheablePath(path);
  const mutating = method !== "GET";
  const key = shouldCache ? cacheKey(path, options.token) : "";

  if (mutating) {
    clearGetCache();
  }

  if (shouldCache) {
    const cached = readCached<T>(key);
    if (cached) return cached;

    const inFlight = inflightGet.get(key);
    if (inFlight) return (await inFlight) as T;
  }

  const doFetch = async (token?: string | null) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      return await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  const runRequest = async (): Promise<T> => {
    let res: Response;
    try {
      res = await doFetch(options.token);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error("API timeout. Check backend server/network.");
      }
      throw new Error("Cannot reach API. Check backend server/network.");
    }

    // If access token expired, try one transparent refresh + retry.
    if (res.status === 401 && options.token) {
      const { refreshToken, setAccessToken, logout } = useAuthStore.getState();
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken })
          });
          if (refreshRes.ok) {
            const refreshed = (await refreshRes.json()) as { accessToken: string };
            setAccessToken(refreshed.accessToken);
            res = await doFetch(refreshed.accessToken);
          } else {
            logout();
          }
        } catch {
          logout();
        }
      }
    }

    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const err = (await res.json()) as { error?: { message?: string } };
        message = err.error?.message ?? message;
      } catch {
        // ignore non-json error payloads
      }
      throw new Error(message);
    }

    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  };

  if (!shouldCache) {
    return runRequest();
  }

  const promise = runRequest()
    .then((data) => {
      writeCached(key, data);
      return data;
    })
    .finally(() => {
      inflightGet.delete(key);
    });
  inflightGet.set(key, promise);
  return (await promise) as T;
}

export function mapBackendRoleToUiRole(role: BackendUserRole): Role {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "AUDITOR":
      return "Vendor";
    case "FINANCE_OFFICER":
      return "Finance Officer";
    case "DEPT_HEAD":
      return "Dept Head";
    case "PUBLIC":
      return "Public";
  }
}

export function paiseStringToRupees(value: string | number | bigint): number {
  const paise = typeof value === "string" ? Number(value) : Number(value);
  return Math.round(paise / 100);
}

export const api = {
  baseUrl: API_BASE,
  login: (email: string, password: string) =>
    request<AuthLoginResponse>("/auth/login", { method: "POST", body: { email, password } }),
  me: (token: string) => request<{ user: AuthUser }>("/auth/me", { token }),
  refresh: (refreshToken: string) =>
    request<{ accessToken: string }>("/auth/refresh", { method: "POST", body: { refreshToken } }),
  logout: (refreshToken: string) => request<void>("/auth/logout", { method: "POST", body: { refreshToken } }),
  dashboardStats: (token: string) => request<DashboardStatsResponse>("/reports/dashboard/stats", { token }),
  transactions: (token: string, query = "") =>
    request<{ data: BackendTransaction[]; pagination: { total: number } }>(
      `/transactions${query ? `?${query}` : ""}`,
      { token }
    ),
  transactionById: (token: string, id: string) => request<{ transaction: BackendTransaction }>(`/transactions/${id}`, { token }),
  flagsFeed: (token: string) => request<{ data: FlagFeedItem[] }>("/flags/feed", { token }),
  flagsStats: (token: string) =>
    request<{ byCategory: Record<string, number>; openBySeverity: Record<string, number> }>("/flags/stats", { token }),
  flagsList: (token: string) => request<{ data: unknown[] }>("/flags", { token }),
  approvals: (token: string) => request<{ data: unknown[] }>("/approvals", { token }),
  approvalChain: (token: string, transactionId: string) =>
    request<{ data: unknown[] }>(`/approvals/${transactionId}`, { token }),
  signApproval: (token: string, transactionId: string, signature?: string) =>
    request(`/approvals/${transactionId}/sign`, { method: "POST", token, body: { signature } }),
  rejectApproval: (token: string, transactionId: string, reason: string) =>
    request(`/approvals/${transactionId}/reject`, { method: "POST", token, body: { reason } }),
  budgets: (token: string) => request<BudgetTreeResponse>("/budgets", { token }),
  allocateBudget: (token: string, payload: BudgetAllocateInput) =>
    request("/budgets/allocate", { method: "POST", token, body: payload }),
  patchDepartmentBudget: (token: string, departmentId: string, allocatedAmountRupees: number) =>
    request(`/budgets/department/${departmentId}`, {
      method: "PATCH",
      token,
      body: { allocatedAmountRupees }
    }),
  allocationRequests: (token: string) => request<{ data: AllocationRequest[] }>("/budgets/requests", { token }),
  createAllocationRequest: (token: string, payload: AllocationRequestInput) =>
    request<{ request: AllocationRequest; message: string }>("/budgets/requests", {
      method: "POST",
      token,
      body: payload
    }),
  approveAllocationRequest: (token: string, requestId: string, signature: string) =>
    request<{ request: AllocationRequest; message: string }>(`/budgets/requests/${requestId}/approve`, {
      method: "POST",
      token,
      body: { signature }
    }),
  users: (token: string) => request<{ data: unknown[] }>("/users", { token }),
  blacklist: (token: string) => request<{ data: unknown[] }>("/admin/blacklist", { token }),
  fraudRules: (token: string) => request<{ data: unknown[] }>("/admin/fraud-rules", { token }),
  systemHealth: (token: string) => request<unknown>("/admin/system/health", { token }),
  auditLogs: (token: string) => request<{ data: unknown[] }>("/admin/audit-logs", { token }),
  reportAudit: (token: string) => request<{ stats: DashboardStatsResponse; recentFlags: unknown[] }>("/reports/audit", { token }),
  queueAuditExport: (token: string) =>
    request<{ jobId: string; status: string }>("/reports/audit/export", { method: "POST", token }),
  downloadAuditExport: (token: string, jobId: string) =>
    request<{ status: string; message?: string }>(`/reports/audit/download/${jobId}`, { token }),
  publicSummary: () => request<unknown>("/public/summary"),
  publicMinistries: () => request<{ ministries: unknown[] }>("/public/ministries"),
  publicLastSync: () => request<{ lastSyncedAt: string | null }>("/public/last-sync")
};
