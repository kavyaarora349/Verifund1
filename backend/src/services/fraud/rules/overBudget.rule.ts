import type { Prisma } from "@prisma/client";
import { prisma } from "../../../config/db.js";

type TxInput = Prisma.TransactionGetPayload<{ include: { department: true } }>;

export async function overBudgetRule(tx: TxInput) {
  const dept = await prisma.department.findUnique({
    where: { id: tx.departmentId },
    include: {
      transactions: {
        where: { status: { in: ["CONFIRMED", "PENDING"] } },
        select: { amount: true }
      }
    }
  });

  if (!dept) return { triggered: false as const };

  const spent = dept.transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const newTotal = spent + Number(tx.amount);
  const allocation = Number(dept.allocatedAmount);

  if (newTotal <= allocation) return { triggered: false as const };
  return {
    triggered: true as const,
    category: "OVER_BUDGET",
    reason: `This transaction would exceed department budget by ${newTotal - allocation} paise`,
    severity: "CRITICAL" as const,
    aiScore: 99
  };
}
