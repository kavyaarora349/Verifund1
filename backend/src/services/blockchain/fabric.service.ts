import { createHash } from "node:crypto";
import type { Transaction } from "@prisma/client";

/** Placeholder until Fabric gateway credentials are wired; produces deterministic IDs for audit trails. */
export async function submitFabricTransaction(tx: Transaction): Promise<{ txId: string }> {
  const digest = createHash("sha256").update(`${tx.id}|${tx.localHash ?? ""}|fabric`).digest("hex").slice(0, 48);
  return { txId: `LOCAL-FABRIC-${digest}` };
}
