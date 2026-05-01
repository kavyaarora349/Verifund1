import type { Prisma } from "@prisma/client";
import { env } from "../../../config/env.js";

type TxInput = Prisma.TransactionGetPayload<{ include: { department: true } }>;

export async function unusualHoursRule(tx: TxInput) {
  const hour = new Date(tx.createdAt).getHours();
  if (hour >= env.FLAG_WORKING_HOURS_START && hour < env.FLAG_WORKING_HOURS_END) {
    return { triggered: false as const };
  }

  return {
    triggered: true as const,
    category: "UNUSUAL_HOURS",
    reason: `Transaction initiated at ${hour}:00, outside working hours (${env.FLAG_WORKING_HOURS_START}:00-${env.FLAG_WORKING_HOURS_END}:00)`,
    severity: "MEDIUM" as const,
    aiScore: 65
  };
}
