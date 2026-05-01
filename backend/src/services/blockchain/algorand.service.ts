import type { Transaction } from "@prisma/client";
import algosdk from "algosdk";
import { env } from "../../config/env.js";

function getAlgodClient(): algosdk.Algodv2 {
  const nodeUrl = env.ALGORAND_NODE_URL;
  if (!nodeUrl) {
    throw new Error("Algorand node URL is not configured");
  }
  return new algosdk.Algodv2("", nodeUrl, "");
}

function getAdminAccount() {
  const mnemonic = env.ALGORAND_ADMIN_MNEMONIC;
  if (!mnemonic) {
    throw new Error("Algorand admin mnemonic is not configured");
  }
  return algosdk.mnemonicToSecretKey(mnemonic);
}

function getAccountFromMnemonic(mnemonic: string) {
  if (!mnemonic) {
    throw new Error("Mnemonic is not configured");
  }
  return algosdk.mnemonicToSecretKey(mnemonic);
}

function normalizeAddress(addr: string | { toString: () => string }): string {
  return typeof addr === "string" ? addr : addr.toString();
}

export async function anchorTransactionAlgorand(tx: Transaction): Promise<{ txId: string; confirmedRound: number }> {
  if (!env.ALGORAND_ADMIN_MNEMONIC || !env.ALGORAND_NODE_URL) {
    throw new Error("Algorand is not configured");
  }

  const adminAccount = getAdminAccount();
  const algodClient = getAlgodClient();
  const params = await algodClient.getTransactionParams().do();

  const payload = JSON.stringify({
    id: tx.id,
    hash: tx.localHash,
    amount: tx.amount.toString(),
    from: tx.fromWallet,
    to: tx.toWallet,
    dept: tx.departmentId,
    ts: tx.createdAt
  });

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: normalizeAddress(adminAccount.addr),
    receiver: normalizeAddress(adminAccount.addr),
    amount: 0,
    note: new TextEncoder().encode(payload),
    suggestedParams: params
  });

  const signedTxn = txn.signTxn(adminAccount.sk);
  const { txid } = await algodClient.sendRawTransaction(signedTxn).do();
  const pending = await algosdk.waitForConfirmation(algodClient, txid, 4);
  const round = pending.confirmedRound ? Number(pending.confirmedRound) : 0;
  return {
    txId: txid,
    confirmedRound: round
  };
}

export async function transferAlgoOnTestnet(input: {
  receiver: string;
  amountAlgo: number;
  note?: string;
  senderMnemonic?: string;
}): Promise<{ txId: string; confirmedRound: number }> {
  if (!algosdk.isValidAddress(input.receiver)) {
    throw new Error("Invalid Algorand receiver address");
  }
  if (!Number.isFinite(input.amountAlgo) || input.amountAlgo <= 0) {
    throw new Error("Invalid ALGO amount");
  }

  const senderAccount = input.senderMnemonic ? getAccountFromMnemonic(input.senderMnemonic) : getAdminAccount();
  const algodClient = getAlgodClient();
  const params = await algodClient.getTransactionParams().do();
  const amountMicroAlgos = Math.round(input.amountAlgo * 1_000_000);

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: normalizeAddress(senderAccount.addr),
    receiver: input.receiver,
    amount: amountMicroAlgos,
    note: input.note ? new TextEncoder().encode(input.note) : undefined,
    suggestedParams: params
  });

  const signedTxn = txn.signTxn(senderAccount.sk);
  const { txid } = await algodClient.sendRawTransaction(signedTxn).do();
  const pending = await algosdk.waitForConfirmation(algodClient, txid, 4);
  const round = pending.confirmedRound ? Number(pending.confirmedRound) : 0;
  return { txId: txid, confirmedRound: round };
}

export async function verifyAlgorandReachable(): Promise<boolean> {
  if (!env.ALGORAND_NODE_URL) return false;
  try {
    const client = getAlgodClient();
    await client.status().do();
    return true;
  } catch {
    return false;
  }
}
