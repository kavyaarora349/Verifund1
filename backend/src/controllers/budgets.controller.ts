import { z } from "zod";
import type { Request, Response } from "express";
import algosdk from "algosdk";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { transferAlgoOnTestnet } from "../services/blockchain/algorand.service.js";
import {
  getBudgetHierarchyTree,
  getDepartmentDetail,
  getMinistryDetail,
  listBudgetAlerts
} from "../services/budgets.service.js";
import { rupeesToPaise } from "../utils/currency.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const allocateSchema = z.object({
  ministryCode: z.string().min(1),
  ministryName: z.string().min(1),
  ministryAllocatedRupees: z.number().int().positive(),
  departmentCode: z.string().min(1),
  departmentName: z.string().min(1),
  departmentAllocatedRupees: z.number().int().positive()
});

const patchDeptSchema = z.object({
  allocatedAmountRupees: z.number().int().positive()
});

const allocationRequestSchema = z.object({
  requestTargetRole: z.enum(["ADMIN", "FINANCE_OFFICER", "DEPT_HEAD"]).optional(),
  beneficiaryWalletAddress: z.string().min(20),
  requestedAlgoAmount: z.number().positive(),
  projectReason: z.string().min(10).max(500),
  ministryCode: z.string().min(1),
  ministryName: z.string().min(1),
  ministryAllocatedRupees: z.number().int().positive(),
  departmentCode: z.string().min(1),
  departmentName: z.string().min(1),
  departmentAllocatedRupees: z.number().int().positive()
});

const approveAllocationRequestSchema = z.object({
  signature: z.string().min(6)
});

export const listBudgetsController = asyncHandler(async (_req: Request, res: Response) => {
  const tree = await getBudgetHierarchyTree();
  res.status(200).json(tree);
});

export const ministryBudgetController = asyncHandler(async (req: Request, res: Response) => {
  const detail = await getMinistryDetail(req.params.id);
  if (!detail) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Ministry not found", statusCode: 404 } });
    return;
  }
  res.status(200).json(detail);
});

export const departmentBudgetController = asyncHandler(async (req: Request, res: Response) => {
  const detail = await getDepartmentDetail(req.params.id);
  if (!detail) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Department not found", statusCode: 404 } });
    return;
  }
  res.status(200).json(detail);
});

export const budgetAlertsController = asyncHandler(async (_req: Request, res: Response) => {
  const alerts = await listBudgetAlerts();
  res.status(200).json({ data: alerts });
});

export const allocateBudgetController = asyncHandler(async (req: Request, res: Response) => {
  const body = allocateSchema.parse(req.body);

  const ministryAllocated = rupeesToPaise(body.ministryAllocatedRupees);
  const departmentAllocated = rupeesToPaise(body.departmentAllocatedRupees);

  const ministry = await prisma.ministry.upsert({
    where: { code: body.ministryCode },
    update: { name: body.ministryName, allocatedAmount: ministryAllocated },
    create: {
      code: body.ministryCode,
      name: body.ministryName,
      allocatedAmount: ministryAllocated
    }
  });

  const department = await prisma.department.upsert({
    where: { code: body.departmentCode },
    update: { name: body.departmentName, allocatedAmount: departmentAllocated, ministryId: ministry.id },
    create: {
      code: body.departmentCode,
      name: body.departmentName,
      allocatedAmount: departmentAllocated,
      ministryId: ministry.id
    }
  });

  res.status(201).json({ ministry, department });
});

export const patchDepartmentBudgetController = asyncHandler(async (req: Request, res: Response) => {
  const body = patchDeptSchema.parse(req.body);
  const allocatedAmount = rupeesToPaise(body.allocatedAmountRupees);
  const department = await prisma.department.update({
    where: { id: req.params.id },
    data: { allocatedAmount }
  });
  res.status(200).json({ department });
});

export const createAllocationRequestController = asyncHandler(async (req: Request, res: Response) => {
  const body = allocationRequestSchema.parse(req.body);
  const requestedById = req.user!.id;
  const requesterRole = req.user!.role;
  if (!algosdk.isValidAddress(body.beneficiaryWalletAddress)) {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid Algorand beneficiary wallet address",
        statusCode: 422
      }
    });
    return;
  }

  const targetRole = body.requestTargetRole ?? "FINANCE_OFFICER";
  if (requesterRole === "DEPT_HEAD" && targetRole === "DEPT_HEAD") {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Dept Head requests must target CFO or Admin",
        statusCode: 422
      }
    });
    return;
  }

  const approver = await prisma.user.findFirst({
    where: { role: targetRole, isActive: true, id: { not: requestedById } },
    select: { id: true, role: true }
  });

  if (!approver) {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: `Approver with role ${targetRole} must exist`,
        statusCode: 422
      }
    });
    return;
  }

  const requestRow = await prisma.allocationRequest.create({
    data: {
      requestedById,
      beneficiaryWalletAddress: body.beneficiaryWalletAddress,
      requestedAlgoAmount: BigInt(Math.round(body.requestedAlgoAmount * 1_000_000)),
      projectReason: body.projectReason,
      ministryCode: body.ministryCode,
      ministryName: body.ministryName,
      ministryAllocatedAmount: rupeesToPaise(body.ministryAllocatedRupees),
      departmentCode: body.departmentCode,
      departmentName: body.departmentName,
      departmentAllocatedAmount: rupeesToPaise(body.departmentAllocatedRupees),
      approvals: {
        create: [{ approverId: approver.id, role: approver.role }]
      }
    },
    include: {
      approvals: { include: { approver: { select: { id: true, name: true, role: true } } } }
    }
  });

  res.status(201).json({ request: requestRow, message: `Allocation request submitted for ${targetRole} approval` });
});

export const listAllocationRequestsController = asyncHandler(async (req: Request, res: Response) => {
  const role = req.user!.role;
  let where = {};

  if (role === "AUDITOR") {
    where = { requestedById: req.user!.id };
  } else if (role === "DEPT_HEAD") {
    where = {
      OR: [
        { requestedById: req.user!.id },
        {
          approvals: {
            some: {
              approverId: req.user!.id
            }
          }
        }
      ]
    };
  } else if (role === "ADMIN" || role === "FINANCE_OFFICER") {
    where = {
      approvals: {
        some: {
          approverId: req.user!.id
        }
      }
    };
  }

  const rows = await prisma.allocationRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { id: true, name: true, email: true, role: true, walletAddress: true } },
      approvals: {
        include: { approver: { select: { id: true, name: true, role: true, walletAddress: true } } },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  res.status(200).json({ data: rows });
});

export const approveAllocationRequestController = asyncHandler(async (req: Request, res: Response) => {
  const body = approveAllocationRequestSchema.parse(req.body);
  const requestId = req.params.requestId;
  const approverId = req.user!.id;

  const requestRow = await prisma.allocationRequest.findUnique({
    where: { id: requestId },
    include: { approvals: true }
  });

  if (!requestRow) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Allocation request not found", statusCode: 404 } });
    return;
  }

  if (requestRow.status !== "PENDING") {
    res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "Request already finalized", statusCode: 422 } });
    return;
  }

  const approvalRow = requestRow.approvals.find((a) => a.approverId === approverId);
  if (!approvalRow) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "You are not an approver for this request", statusCode: 403 } });
    return;
  }

  if (approvalRow.status !== "SIGNED") {
    await prisma.allocationRequestApproval.update({
      where: { id: approvalRow.id },
      data: { status: "SIGNED", signature: body.signature, signedAt: new Date() }
    });
  }

  const refreshed = await prisma.allocationRequest.findUnique({
    where: { id: requestId },
    include: { approvals: true }
  });

  if (!refreshed) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Request disappeared", statusCode: 500 } });
    return;
  }

  const allSigned = refreshed.approvals.every((a) => a.status === "SIGNED");

  if (allSigned) {
    const payerRole = refreshed.approvals[0]?.role ?? "FINANCE_OFFICER";
    const senderMnemonic =
      payerRole === "DEPT_HEAD" ? env.ALGORAND_DEPT_HEAD_MNEMONIC : env.ALGORAND_ADMIN_MNEMONIC;

    if (!env.ALGORAND_NODE_URL || !senderMnemonic) {
      res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message:
            payerRole === "DEPT_HEAD"
              ? "On-chain payout is not configured for Dept Head. Set ALGORAND_DEPT_HEAD_MNEMONIC."
              : "On-chain payout is not configured for CFO/Admin. Set ALGORAND_ADMIN_MNEMONIC.",
          statusCode: 422
        }
      });
      return;
    }

    let payoutTxId = refreshed.payoutTxId;
    let payoutRound = refreshed.payoutRound;
    let payoutAt = refreshed.payoutAt;

    if (!payoutTxId) {
      try {
        const transfer = await transferAlgoOnTestnet({
          receiver: refreshed.beneficiaryWalletAddress,
          amountAlgo: Number(refreshed.requestedAlgoAmount) / 1_000_000,
          senderMnemonic,
          note: JSON.stringify({
            type: "PUBLEDGER_ALLOCATION_PAYOUT",
            requestId: refreshed.id,
            ministryCode: refreshed.ministryCode,
            departmentCode: refreshed.departmentCode
          })
        });
        payoutTxId = transfer.txId;
        payoutRound = transfer.confirmedRound;
        payoutAt = new Date();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown Algorand error";
        res.status(502).json({
          error: {
            code: "BLOCKCHAIN_ERROR",
            message: `On-chain payout failed on Algorand TestNet: ${message}`,
            statusCode: 502
          }
        });
        return;
      }
    }

    const ministry = await prisma.ministry.upsert({
      where: { code: refreshed.ministryCode },
      update: { name: refreshed.ministryName, allocatedAmount: refreshed.ministryAllocatedAmount },
      create: {
        code: refreshed.ministryCode,
        name: refreshed.ministryName,
        allocatedAmount: refreshed.ministryAllocatedAmount
      }
    });

    const department = await prisma.department.upsert({
      where: { code: refreshed.departmentCode },
      update: {
        name: refreshed.departmentName,
        allocatedAmount: refreshed.departmentAllocatedAmount,
        ministryId: ministry.id
      },
      create: {
        code: refreshed.departmentCode,
        name: refreshed.departmentName,
        allocatedAmount: refreshed.departmentAllocatedAmount,
        ministryId: ministry.id
      }
    });

    const approverUser = await prisma.user.findUnique({
      where: { id: approverId },
      select: { id: true, name: true, walletAddress: true }
    });

    const txAmountPaise = refreshed.departmentAllocatedAmount;
    const fromWallet = approverUser?.walletAddress?.trim() || `USER:${approverId}`;
    const fromName = approverUser?.name || "Allocation Approver";
    const toWallet = refreshed.beneficiaryWalletAddress;
    const toName = refreshed.departmentName;

    await prisma.transaction.create({
      data: {
        fromName,
        fromWallet,
        toName,
        toWallet,
        toType: "department_allocation",
        amount: txAmountPaise,
        description: `Allocation request approved: ${refreshed.id}`,
        departmentId: department.id,
        ministry: refreshed.ministryName,
        initiatedById: refreshed.requestedById,
        status: "CONFIRMED",
        blockchainTxHash: payoutTxId ?? null,
        blockNumber: payoutRound ?? null,
        onChainAt: payoutAt ?? new Date()
      }
    });

    await prisma.allocationRequest.update({
      where: { id: refreshed.id },
      data: {
        status: "APPROVED",
        payoutTxId,
        payoutRound,
        payoutAt
      }
    });
  }

  const result = await prisma.allocationRequest.findUnique({
    where: { id: requestId },
    include: {
      requestedBy: { select: { id: true, name: true, email: true, role: true, walletAddress: true } },
      approvals: {
        include: { approver: { select: { id: true, name: true, role: true, walletAddress: true } } },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  res.status(200).json({
    request: result,
    message: allSigned ? "Allocation approved and applied" : "Approval recorded, waiting for second approver"
  });
});
