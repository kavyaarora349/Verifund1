import type { FlagSeverity, Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";
import { AppError } from "../utils/appError.js";

let flagStatsCache: { value: Awaited<ReturnType<typeof computeFlagStats>>; expiresAt: number } | null = null;
const FLAG_STATS_CACHE_TTL_MS = 10_000;

export async function listFlags(query: {
  severity?: FlagSeverity;
  category?: string;
  isResolved?: boolean;
  fromDate?: Date;
  toDate?: Date;
  skip: number;
  take: number;
}) {
  const where: Prisma.FlagWhereInput = {};
  if (query.severity) where.severity = query.severity;
  if (query.category) where.category = query.category;
  if (typeof query.isResolved === "boolean") where.isResolved = query.isResolved;
  if (query.fromDate || query.toDate) {
    where.createdAt = {};
    if (query.fromDate) where.createdAt.gte = query.fromDate;
    if (query.toDate) where.createdAt.lte = query.toDate;
  }

  const [total, data] = await prisma.$transaction([
    prisma.flag.count({ where }),
    prisma.flag.findMany({
      where,
      include: { transaction: { include: { department: true } } },
      orderBy: { createdAt: "desc" },
      skip: query.skip,
      take: query.take
    })
  ]);

  return { total, data };
}

export async function getFlag(id: string) {
  const flag = await prisma.flag.findUnique({
    where: { id },
    include: { transaction: { include: { department: true, approvals: true } } }
  });
  if (!flag) throw new AppError("NOT_FOUND", "Flag not found", 404);
  return flag;
}

export async function resolveFlag(
  id: string,
  resolvedById: string,
  resolution: string,
  note?: string
) {
  const flag = await prisma.flag.findUnique({ where: { id } });
  if (!flag) throw new AppError("NOT_FOUND", "Flag not found", 404);

  const resolutionText = note?.trim() ? `${resolution}: ${note.trim()}` : resolution;

  return prisma.flag.update({
    where: { id },
    data: {
      isResolved: true,
      resolvedById,
      resolvedAt: new Date(),
      resolution: resolutionText
    }
  });
}

async function computeFlagStats() {
  const [byCategoryRows, openBySeverityRows] = await prisma.$transaction([
    prisma.flag.groupBy({
      by: ["category"],
      orderBy: { category: "asc" },
      _count: { _all: true }
    }),
    prisma.flag.groupBy({
      by: ["severity"],
      where: { isResolved: false },
      orderBy: { severity: "asc" },
      _count: { _all: true }
    })
  ]);

  const byCategory: Record<string, number> = {};
  const openBySeverity: Record<string, number> = {};

  for (const row of byCategoryRows) {
    const c = row._count && typeof row._count === "object" && "_all" in row._count ? row._count._all : 0;
    byCategory[row.category] = c ?? 0;
  }
  for (const row of openBySeverityRows) {
    const c = row._count && typeof row._count === "object" && "_all" in row._count ? row._count._all : 0;
    openBySeverity[row.severity] = c ?? 0;
  }

  return { byCategory, openBySeverity };
}

export async function flagStats() {
  const now = Date.now();
  if (flagStatsCache && flagStatsCache.expiresAt > now) {
    return flagStatsCache.value;
  }
  const value = await computeFlagStats();
  flagStatsCache = { value, expiresAt: now + FLAG_STATS_CACHE_TTL_MS };
  return value;
}

export async function flagFeed() {
  return prisma.flag.findMany({
    where: { isResolved: false },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { transaction: { select: { id: true, amount: true, toName: true, status: true } } }
  });
}
