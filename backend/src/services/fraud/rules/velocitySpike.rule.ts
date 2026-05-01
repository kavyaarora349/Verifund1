import type { Prisma } from "@prisma/client";
import { prisma } from "../../../config/db.js";
import { env } from "../../../config/env.js";
import { subHours } from "../time.js";

type TxInput = Prisma.TransactionGetPayload<{ include: { department: true } }>;

export async function velocitySpikeRule(tx: TxInput) {
  const count = await prisma.transaction.count({
    where: {
      toWallet: tx.toWallet,
      createdAt: { gte: subHours(new Date(), env.FLAG_VELOCITY_WINDOW_HOURS) },
      status: { not: "REJECTED" }
    }
  });

  if (count < env.FLAG_VELOCITY_COUNT) return { triggered: false as const };
  return {
    triggered: true as const,
    category: "VELOCITY_SPIKE",
    reason: `Vendor received ${count} payments in ${env.FLAG_VELOCITY_WINDOW_HOURS} hours`,
    severity: "HIGH" as const,
    aiScore: 80
  };
}
