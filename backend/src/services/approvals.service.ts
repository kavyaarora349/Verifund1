import type { Role } from "@prisma/client";
import { prisma } from "../config/db.js";
import { AppError } from "../utils/appError.js";
import { writeToLedger } from "./blockchain/ledger.service.js";
import { emitTxConfirmed } from "./notifications/socket.service.js";

export async function listPendingApprovalsForUser(userId: string) {
  return prisma.approval.findMany({
    where: { userId, status: "PENDING" },
    include: { transaction: { include: { department: true } } },
    orderBy: { createdAt: "desc" }
  });
}

export async function getApprovalChain(transactionId: string) {
  return prisma.approval.findMany({
    where: { transactionId },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: "asc" }
  });
}

export async function signApproval(transactionId: string, userId: string, signature?: string | null) {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { approvals: true }
  });

  if (!tx) throw new AppError("NOT_FOUND", "Transaction not found", 404);
  if (tx.status === "FLAGGED") {
    throw new AppError("FORBIDDEN", "Transaction is flagged pending review", 403);
  }
  if (tx.status !== "PENDING") {
    throw new AppError("VALIDATION_ERROR", "Transaction is not awaiting approvals", 422);
  }

  const approval = tx.approvals.find((a) => a.userId === userId && a.status === "PENDING");
  if (!approval) throw new AppError("FORBIDDEN", "No pending approval for this user", 403);

  await prisma.approval.update({
    where: { id: approval.id },
    data: { status: "SIGNED", signature: signature ?? null, signedAt: new Date() }
  });

  const refreshed = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { approvals: true }
  });

  if (!refreshed) throw new AppError("INTERNAL_ERROR", "Transaction missing after update", 500);

  if (refreshed.approvals.some((a) => a.status === "REJECTED")) {
    const a = await prisma.approval.findUnique({ where: { id: approval.id } });
    return { approval: a, transactionStatus: refreshed.status };
  }

  const allSigned = refreshed.approvals.every((a) => a.status === "SIGNED");
  if (!allSigned) {
    const a = await prisma.approval.findUnique({ where: { id: approval.id } });
    return { approval: a, transactionStatus: refreshed.status };
  }

  const ledgerResult = await writeToLedger(refreshed);
  const confirmed = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: "CONFIRMED",
      blockchainTxHash: ledgerResult.txId,
      blockNumber: ledgerResult.blockNumber ?? undefined,
      onChainAt: new Date()
    }
  });

  emitTxConfirmed({
    transactionId: confirmed.id,
    blockNumber: ledgerResult.blockNumber,
    blockchainTxHash: ledgerResult.txId
  });

  const a = await prisma.approval.findUnique({ where: { id: approval.id } });
  return {
    approval: a,
    transactionStatus: confirmed.status,
    blockchainTxId: ledgerResult.txId
  };
}

export async function rejectApproval(transactionId: string, userId: string, reason: string) {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { approvals: true }
  });

  if (!tx) throw new AppError("NOT_FOUND", "Transaction not found", 404);
  if (tx.status !== "PENDING" && tx.status !== "FLAGGED") {
    throw new AppError("VALIDATION_ERROR", "Transaction cannot be rejected in current state", 422);
  }

  const approval = tx.approvals.find((a) => a.userId === userId && a.status === "PENDING");
  if (!approval) throw new AppError("FORBIDDEN", "No pending approval for this user", 403);

  await prisma.$transaction([
    prisma.approval.update({
      where: { id: approval.id },
      data: { status: "REJECTED", rejectionReason: reason, signedAt: new Date() }
    }),
    prisma.transaction.update({
      where: { id: transactionId },
      data: { status: "REJECTED" }
    })
  ]);

  const a = await prisma.approval.findUnique({ where: { id: approval.id } });
  return { approval: a, transactionStatus: "REJECTED" as const };
}

async function findUserForRole(role: Role, excludeIds: string[], departmentName?: string) {
  if (role === "DEPT_HEAD" && departmentName) {
    const deptMatch = await prisma.user.findFirst({
      where: {
        role,
        isActive: true,
        id: { notIn: excludeIds },
        department: { equals: departmentName, mode: "insensitive" }
      }
    });
    if (deptMatch) return deptMatch;
  }

  return prisma.user.findFirst({
    where: { role, isActive: true, id: { notIn: excludeIds } }
  });
}

/** Builds ordered approval chain from amount thresholds (rupees in API). */
export async function resolveApproverUserIds(params: {
  amountRupees: number;
  departmentName: string;
  initiatorId: string;
}): Promise<{ role: Role; userId: string }[]> {
  const out: { role: Role; userId: string }[] = [];
  const used = new Set<string>();

  const exclude = () => [...used, params.initiatorId];

  let finance = await findUserForRole("FINANCE_OFFICER", exclude());
  if (!finance) {
    finance = await findUserForRole("ADMIN", exclude());
  }
  if (!finance) {
    throw new AppError("INTERNAL_ERROR", "No finance officer or admin available to approve", 500);
  }

  out.push({ role: finance.role, userId: finance.id });
  used.add(finance.id);

  if (params.amountRupees >= 1_000_000) {
    const deptHead = await findUserForRole("DEPT_HEAD", exclude(), params.departmentName);
    if (!deptHead) {
      throw new AppError("INTERNAL_ERROR", "No department head configured for this department", 500);
    }
    if (!used.has(deptHead.id)) {
      out.push({ role: deptHead.role, userId: deptHead.id });
      used.add(deptHead.id);
    }
  }

  if (params.amountRupees >= 10_000_000) {
    const admin = await prisma.user.findFirst({
      where: {
        role: "ADMIN",
        isActive: true,
        id: { notIn: [...used, params.initiatorId] }
      }
    });
    if (!admin) throw new AppError("INTERNAL_ERROR", "No admin approver available", 500);
    out.push({ role: admin.role, userId: admin.id });
    used.add(admin.id);
  }

  return out;
}
