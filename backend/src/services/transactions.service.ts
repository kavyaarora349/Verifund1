import type { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { enqueueFraudCheck } from "../jobs/queue.js";
import { emitApprovalNeeded, emitToUser } from "./notifications/socket.service.js";
import { rupeesToPaise } from "../utils/currency.js";
import { AppError } from "../utils/appError.js";
import { computeTransactionHash } from "../utils/hash.js";
import { resolveApproverUserIds } from "./approvals.service.js";
import { runFraudChecksWithSideEffects } from "./fraud/detector.service.js";

type CreateTransactionInput = {
  toName: string;
  toWallet: string;
  toType: string;
  amountRupees: number;
  departmentId: string;
  description?: string;
  initiatedById: string;
};

export async function createTransaction(input: CreateTransactionInput) {
  const initiator = await prisma.user.findUnique({ where: { id: input.initiatedById } });
  if (!initiator) throw new AppError("NOT_FOUND", "Initiator not found", 404);

  const amountPaise = rupeesToPaise(input.amountRupees);

  const department = await prisma.department.findUnique({
    where: { id: input.departmentId },
    include: {
      ministry: true,
      transactions: {
        where: { status: { in: ["PENDING", "CONFIRMED"] } },
        select: { amount: true }
      }
    }
  });

  if (!department) {
    throw new AppError("NOT_FOUND", "Department not found", 404);
  }

  const spent = department.transactions.reduce((sum, tx) => sum + tx.amount, 0n);
  if (spent + amountPaise > department.allocatedAmount) {
    throw new AppError("INSUFFICIENT_BUDGET", "Transaction amount exceeds department budget", 422, "amount");
  }

  const blacklisted = await prisma.blacklist.findFirst({
    where: {
      OR: [{ walletAddress: input.toWallet }, { vendorName: { equals: input.toName, mode: "insensitive" } }]
    }
  });

  if (blacklisted) {
    throw new AppError("BLACKLISTED_ENTITY", "Recipient is blacklisted", 422, "toWallet");
  }

  const duplicate = await prisma.transaction.findFirst({
    where: {
      toWallet: input.toWallet,
      amount: amountPaise,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      status: { not: "REJECTED" }
    }
  });

  if (duplicate) {
    throw new AppError("DUPLICATE_TRANSACTION", "Duplicate vendor and amount within 24 hours", 409, "amount");
  }

  const previous = await prisma.transaction.findFirst({
    where: { departmentId: input.departmentId },
    orderBy: { createdAt: "desc" },
    select: { localHash: true }
  });

  const fromWallet = initiator.walletAddress?.trim() || `USER:${initiator.id}`;
  const fromName = initiator.name;

  const transaction = await prisma.transaction.create({
    data: {
      fromName,
      fromWallet,
      toName: input.toName,
      toWallet: input.toWallet,
      toType: input.toType,
      amount: amountPaise,
      description: input.description ?? null,
      departmentId: input.departmentId,
      ministry: department.ministry.name,
      initiatedById: input.initiatedById,
      previousHash: previous?.localHash ?? null
    }
  });

  const localHash = computeTransactionHash({
    id: transaction.id,
    fromWallet: transaction.fromWallet,
    toWallet: transaction.toWallet,
    amount: transaction.amount,
    createdAt: transaction.createdAt,
    previousHash: previous?.localHash ?? null
  });

  const updated = await prisma.transaction.update({
    where: { id: transaction.id },
    data: { localHash }
  });

  const approvers = await resolveApproverUserIds({
    amountRupees: input.amountRupees,
    departmentName: department.name,
    initiatorId: input.initiatedById
  });

  await prisma.approval.createMany({
    data: approvers.map((a) => ({
      transactionId: updated.id,
      userId: a.userId,
      role: a.role,
      status: "PENDING"
    }))
  });

  for (const a of approvers) {
    emitToUser(a.userId, "approval:needed", {
      transactionId: updated.id,
      amountRupees: input.amountRupees,
      departmentId: department.id
    });
    emitApprovalNeeded({
      transactionId: updated.id,
      amountRupees: input.amountRupees,
      approverUserId: a.userId
    });
  }

  if (env.RUN_QUEUE_WORKER) {
    await enqueueFraudCheck(updated.id);
  } else {
    await runFraudChecksWithSideEffects(updated.id);
  }

  return {
    transaction: updated,
    localHash,
    message: "Transaction created and queued for fraud analysis"
  };
}

export function transactionListWhereForRole(user: {
  role: string;
  department: string | null;
}): Prisma.TransactionWhereInput | null {
  if (user.role === "PUBLIC") return null;
  if (user.role === "ADMIN" || user.role === "AUDITOR" || user.role === "FINANCE_OFFICER") {
    return {};
  }
  if (user.role === "DEPT_HEAD" && user.department) {
    const raw = user.department.trim();
    const candidates = Array.from(
      new Set(
        [
          raw,
          raw.split("—")[0]?.trim(),
          raw.split("-")[0]?.trim(),
          raw.split(/\s+/)[0]?.trim()
        ].filter((v): v is string => Boolean(v && v.length >= 3))
      )
    );

    return {
      OR: candidates.map((dept) => ({
        department: { name: { contains: dept, mode: "insensitive" } }
      }))
    };
  }
  return null;
}
