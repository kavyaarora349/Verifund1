import type { TxStatus } from "@prisma/client";
import { prisma } from "../config/db.js";

let budgetTreeCache: { value: Awaited<ReturnType<typeof computeBudgetHierarchyTree>>; expiresAt: number } | null = null;
const BUDGET_TREE_CACHE_TTL_MS = 15_000;

function pct(part: bigint, whole: bigint): number {
  if (whole <= 0n) return 0;
  return Math.round((Number(part * 10000n / whole)) / 100);
}

async function sumsByDepartment(statuses: TxStatus[]) {
  const rows = await prisma.transaction.groupBy({
    by: ["departmentId"],
    where: { status: { in: statuses } },
    _sum: { amount: true }
  });
  const map = new Map<string, bigint>();
  for (const row of rows) {
    map.set(row.departmentId, row._sum.amount ?? 0n);
  }
  return map;
}

async function computeBudgetHierarchyTree() {
  const ministries = await prisma.ministry.findMany({
    include: { departments: true },
    orderBy: { name: "asc" }
  });

  const confirmed = await sumsByDepartment(["CONFIRMED"]);
  const pending = await sumsByDepartment(["PENDING"]);
  const flagged = await sumsByDepartment(["FLAGGED"]);

  let totalAllocated = 0n;
  let totalDisbursed = 0n;

  const ministryPayload = ministries.map((m) => {
    totalAllocated += m.allocatedAmount;

    const departments = m.departments.map((d) => {
      const allocatedAmount = d.allocatedAmount;
      const spentAmount = confirmed.get(d.id) ?? 0n;
      const pendingAmount = pending.get(d.id) ?? 0n;
      const flaggedAmount = flagged.get(d.id) ?? 0n;

      totalDisbursed += spentAmount;

      return {
        id: d.id,
        name: d.name,
        code: d.code,
        allocatedAmount,
        spentAmount,
        utilizationPct: pct(spentAmount, allocatedAmount),
        pendingAmount,
        flaggedAmount
      };
    });

    const mSpent = departments.reduce((s, d) => s + d.spentAmount, 0n);

    return {
      id: m.id,
      name: m.name,
      code: m.code,
      allocatedAmount: m.allocatedAmount,
      spentAmount: mSpent,
      utilizationPct: pct(mSpent, m.allocatedAmount),
      departments
    };
  });

  return {
    totalAllocated,
    totalDisbursed,
    utilizationPct: pct(totalDisbursed, totalAllocated),
    ministries: ministryPayload
  };
}

export async function getBudgetHierarchyTree() {
  const now = Date.now();
  if (budgetTreeCache && budgetTreeCache.expiresAt > now) {
    return budgetTreeCache.value;
  }
  const value = await computeBudgetHierarchyTree();
  budgetTreeCache = { value, expiresAt: now + BUDGET_TREE_CACHE_TTL_MS };
  return value;
}

export async function getMinistryDetail(ministryId: string) {
  const m = await prisma.ministry.findUnique({
    where: { id: ministryId },
    include: { departments: true }
  });
  if (!m) return null;
  const confirmed = await sumsByDepartment(["CONFIRMED"]);
  const departments = m.departments.map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    allocatedAmount: d.allocatedAmount,
    spentAmount: confirmed.get(d.id) ?? 0n,
    utilizationPct: pct(confirmed.get(d.id) ?? 0n, d.allocatedAmount)
  }));
  const spent = departments.reduce((s, d) => s + d.spentAmount, 0n);
  return {
    ministry: { id: m.id, name: m.name, code: m.code },
    allocatedAmount: m.allocatedAmount,
    spentAmount: spent,
    utilizationPct: pct(spent, m.allocatedAmount),
    departments
  };
}

export async function getDepartmentDetail(departmentId: string) {
  const d = await prisma.department.findUnique({
    where: { id: departmentId },
    include: { ministry: true }
  });
  if (!d) return null;
  const confirmed = await sumsByDepartment(["CONFIRMED"]);
  const pending = await sumsByDepartment(["PENDING"]);
  const flagged = await sumsByDepartment(["FLAGGED"]);
  const spent = confirmed.get(d.id) ?? 0n;
  return {
    department: {
      id: d.id,
      name: d.name,
      code: d.code,
      ministry: d.ministry
    },
    allocatedAmount: d.allocatedAmount,
    spentAmount: spent,
    pendingAmount: pending.get(d.id) ?? 0n,
    flaggedAmount: flagged.get(d.id) ?? 0n,
    utilizationPct: pct(spent, d.allocatedAmount)
  };
}

export async function listBudgetAlerts() {
  return prisma.budgetAlert.findMany({
    include: { department: { include: { ministry: true } } },
    orderBy: { createdAt: "desc" }
  });
}
