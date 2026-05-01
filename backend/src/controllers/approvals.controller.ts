import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import {
  getApprovalChain,
  listPendingApprovalsForUser,
  rejectApproval,
  signApproval
} from "../services/approvals.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { transactionListWhereForRole } from "../services/transactions.service.js";
import { AppError } from "../utils/appError.js";

const signSchema = z.object({
  signature: z.string().optional()
});

const rejectSchema = z.object({
  reason: z.string().min(3)
});

export const listMyApprovalsController = asyncHandler(async (req: Request, res: Response) => {
  const items = await listPendingApprovalsForUser(req.user!.id);
  res.status(200).json({ data: items });
});

export const getApprovalsForTxController = asyncHandler(async (req: Request, res: Response) => {
  const scope = transactionListWhereForRole(req.user!);
  if (scope === null) throw new AppError("FORBIDDEN", "Insufficient permissions", 403);

  const txId = req.params.transactionId;
  if (Object.keys(scope).length > 0) {
    const ok = await prisma.transaction.count({ where: { id: txId, ...scope } });
    if (!ok) throw new AppError("FORBIDDEN", "Insufficient permissions", 403);
  }

  const chain = await getApprovalChain(txId);
  res.status(200).json({ data: chain });
});

export const signApprovalController = asyncHandler(async (req: Request, res: Response) => {
  const body = signSchema.parse(req.body);
  const result = await signApproval(req.params.transactionId, req.user!.id, body.signature ?? null);
  res.status(200).json(result);
});

export const rejectApprovalController = asyncHandler(async (req: Request, res: Response) => {
  const body = rejectSchema.parse(req.body);
  const result = await rejectApproval(req.params.transactionId, req.user!.id, body.reason);
  res.status(200).json(result);
});
