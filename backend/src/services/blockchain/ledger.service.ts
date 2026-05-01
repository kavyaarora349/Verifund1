import type { Transaction } from "@prisma/client";
import { createHash } from "node:crypto";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/appError.js";
import { anchorTransactionAlgorand } from "./algorand.service.js";
import { submitFabricTransaction } from "./fabric.service.js";

export async function writeToLedger(tx: Transaction): Promise<{ txId: string; blockNumber: number | null }> {
  const threshold = env.ledgerAlgorandThresholdPaise;

  if (tx.amount >= threshold) {
    if (env.ALGORAND_ADMIN_MNEMONIC && env.ALGORAND_NODE_URL) {
      try {
        const { txId, confirmedRound } = await anchorTransactionAlgorand(tx);
        return { txId, blockNumber: confirmedRound };
      } catch {
        throw new AppError("BLOCKCHAIN_ERROR", "Algorand anchoring failed", 502);
      }
    }

    const fallback = `LOCAL-ALGO-${createHash("sha256")
      .update(`${tx.id}|${tx.localHash ?? ""}`)
      .digest("hex")
      .slice(0, 48)}`;
    return { txId: fallback, blockNumber: Math.floor(Date.now() / 1000) };
  }

  try {
    const { txId } = await submitFabricTransaction(tx);
    return { txId, blockNumber: null };
  } catch {
    throw new AppError("BLOCKCHAIN_ERROR", "Fabric submit failed", 502);
  }
}
