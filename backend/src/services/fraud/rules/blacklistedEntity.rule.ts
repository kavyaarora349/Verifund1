import type { Prisma } from "@prisma/client";
import { prisma } from "../../../config/db.js";

type TxInput = Prisma.TransactionGetPayload<{ include: { department: true } }>;

export async function blacklistedEntityRule(tx: TxInput) {
  const hit = await prisma.blacklist.findFirst({
    where: {
      OR: [{ walletAddress: tx.toWallet }, { vendorName: { equals: tx.toName, mode: "insensitive" } }]
    }
  });

  if (!hit) return { triggered: false as const };
  return {
    triggered: true as const,
    category: "BLACKLISTED_ENTITY",
    reason: `Recipient "${tx.toName}" is on the blacklist: ${hit.reason}`,
    severity: "CRITICAL" as const,
    aiScore: 100
  };
}
