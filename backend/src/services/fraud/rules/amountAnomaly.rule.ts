import type { FlagSeverity, Prisma, TxStatus } from "@prisma/client";
import { subDays } from "../time.js";
import { prisma } from "../../../config/db.js";
import { env } from "../../../config/env.js";

type TxInput = Prisma.TransactionGetPayload<{ include: { department: true } }>;

export async function amountAnomalyRule(tx: TxInput) {
  const avg = await prisma.transaction.aggregate({
    where: {
      departmentId: tx.departmentId,
      status: "CONFIRMED" as TxStatus,
      createdAt: { gte: subDays(new Date(), 90) }
    },
    _avg: { amount: true }
  });

  const avgAmount = Number(avg._avg.amount ?? 0);
  if (avgAmount <= 0) return { triggered: false as const };

  const ratio = Number(tx.amount) / avgAmount;
  if (ratio <= env.FLAG_AMOUNT_MULTIPLIER) return { triggered: false as const };

  const severity: FlagSeverity = ratio > 10 ? "CRITICAL" : ratio > 5 ? "HIGH" : "MEDIUM";
  return {
    triggered: true as const,
    category: "AMOUNT_ANOMALY",
    reason: `Amount is ${ratio.toFixed(1)}x the 90-day department average`,
    severity,
    aiScore: Math.min(95, Math.round(40 + ratio * 5))
  };
}
