import { prisma } from "../config/db.js";

let dashboardStatsCache: { value: Awaited<ReturnType<typeof computeDashboardStats>>; expiresAt: number } | null = null;
const DASHBOARD_CACHE_TTL_MS = 15_000;

async function computeDashboardStats() {
  const allocatedAgg = await prisma.ministry.aggregate({
    _sum: { allocatedAmount: true }
  });
  const totalAllocated = allocatedAgg._sum.allocatedAmount ?? 0n;

  const confirmedSum = await prisma.transaction.aggregate({
    where: { status: "CONFIRMED" },
    _sum: { amount: true }
  });
  const totalDisbursed = confirmedSum._sum.amount ?? 0n;

  const [pendingApprovals, flaggedTransactions, criticalFlags, openFlagCategories] =
    await prisma.$transaction([
      prisma.approval.count({ where: { status: "PENDING" } }),
      prisma.transaction.count({ where: { status: "FLAGGED" } }),
      prisma.flag.count({ where: { isResolved: false, severity: "CRITICAL" } }),
      prisma.flag.groupBy({
        by: ["category"],
        where: { isResolved: false },
        _count: { _all: true }
      })
    ]);

  const flagsByCategory: Record<string, number> = {};
  for (const f of openFlagCategories) {
    flagsByCategory[f.category] = f._count._all;
  }

  const latestConfirmed = await prisma.transaction.findFirst({
    where: { blockchainTxHash: { not: null } },
    orderBy: { onChainAt: "desc" },
    select: { blockNumber: true, onChainAt: true }
  });

  return {
    totalAllocated,
    totalDisbursed,
    pendingApprovals,
    flaggedTransactions,
    criticalFlags,
    latestBlockHeight: latestConfirmed?.blockNumber ?? null,
    lastSyncedAt: latestConfirmed?.onChainAt?.toISOString() ?? null,
    flagsByCategory
  };
}

export async function dashboardStats() {
  const now = Date.now();
  if (dashboardStatsCache && dashboardStatsCache.expiresAt > now) {
    return dashboardStatsCache.value;
  }
  const value = await computeDashboardStats();
  dashboardStatsCache = { value, expiresAt: now + DASHBOARD_CACHE_TTL_MS };
  return value;
}

export async function publicSummary() {
  const stats = await dashboardStats();
  const ministries = await prisma.ministry.findMany({
    include: {
      departments: {
        include: {
          transactions: {
            where: { status: "CONFIRMED" },
            select: { amount: true }
          }
        }
      }
    }
  });

  const ministryCards = ministries.map((m) => {
    let spent = 0n;
    for (const d of m.departments) {
      spent += d.transactions.reduce((s, t) => s + t.amount, 0n);
    }
    const allocated = m.allocatedAmount;
    return {
      id: m.id,
      name: m.name,
      code: m.code,
      allocatedAmount: allocated,
      spentAmount: spent,
      utilizationPct: allocated > 0n ? Number((spent * 10000n) / allocated) / 100 : 0
    };
  });

  return {
    totalAllocated: stats.totalAllocated,
    totalDisbursed: stats.totalDisbursed,
    ministries: ministryCards
  };
}
