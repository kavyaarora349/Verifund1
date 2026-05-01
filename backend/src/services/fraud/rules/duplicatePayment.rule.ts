import type { Prisma } from "@prisma/client";
import { subHours } from "../time.js";
import { prisma } from "../../../config/db.js";

type TxInput = Prisma.TransactionGetPayload<{ include: { department: true } }>;

export async function duplicatePaymentRule(tx: TxInput) {
  const duplicate = await prisma.transaction.findFirst({
    where: {
      id: { not: tx.id },
      toWallet: tx.toWallet,
      amount: tx.amount,
      createdAt: { gte: subHours(new Date(), 24) },
      status: { not: "REJECTED" }
    }
  });

  if (!duplicate) return { triggered: false as const };

  return {
    triggered: true as const,
    category: "DUPLICATE_PAYMENT",
    reason: `Same vendor and amount as transaction ${duplicate.id} within 24 hours`,
    severity: "CRITICAL" as const,
    aiScore: 95
  };
}
