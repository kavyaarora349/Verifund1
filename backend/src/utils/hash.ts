import crypto from "node:crypto";

export function computeTransactionHash(tx: {
  id: string;
  fromWallet: string;
  toWallet: string;
  amount: bigint;
  createdAt: Date;
  previousHash: string | null;
}): string {
  const data = [
    tx.id,
    tx.fromWallet,
    tx.toWallet,
    tx.amount.toString(),
    tx.createdAt.toISOString(),
    tx.previousHash ?? "GENESIS"
  ].join("|");

  return crypto.createHash("sha256").update(data).digest("hex");
}
