import type { TxStatus } from "@prisma/client";
import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parsePagination } from "../utils/pagination.js";
import { createTransaction, transactionListWhereForRole } from "../services/transactions.service.js";
import { AppError } from "../utils/appError.js";

const createTxSchema = z.object({
  toName: z.string().min(1),
  toWallet: z.string().min(1),
  toType: z.string().min(1),
  amount: z.coerce.number().int().positive(),
  departmentId: z.string().uuid(),
  description: z.string().optional()
});

const patchStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "FLAGGED", "REJECTED"])
});

export const createTransactionController = asyncHandler(async (req: Request, res: Response) => {
  const body = createTxSchema.parse(req.body);
  const result = await createTransaction({
    toName: body.toName,
    toWallet: body.toWallet,
    toType: body.toType,
    amountRupees: body.amount,
    departmentId: body.departmentId,
    description: body.description,
    initiatedById: req.user!.id
  });
  res.status(201).json(result);
});

export const listTransactionsController = asyncHandler(async (req: Request, res: Response) => {
  const scope = transactionListWhereForRole(req.user!);
  if (scope === null) {
    res.status(200).json({
      data: [],
      pagination: { total: 0, page: 1, limit: 50, totalPages: 0 }
    });
    return;
  }

  const { page, limit, skip } = parsePagination(req.query);

  const status = req.query.status as TxStatus | undefined;
  const departmentId = typeof req.query.department === "string" ? req.query.department : undefined;
  const ministry = typeof req.query.ministry === "string" ? req.query.ministry : undefined;
  const fromDate =
    typeof req.query.fromDate === "string" ? new Date(req.query.fromDate) : undefined;
  const toDate = typeof req.query.toDate === "string" ? new Date(req.query.toDate) : undefined;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const sortBy =
    req.query.sortBy === "amount" || req.query.sortBy === "createdAt" ? req.query.sortBy : "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";
  const flaggedOnly = req.query.flagged === "true" ? true : undefined;
  const includeFlags = req.query.includeFlags === "true";
  const includeApprovals = req.query.includeApprovals === "true";

  const effectiveStatus: TxStatus | undefined = flaggedOnly ? "FLAGGED" : status;

  const where = {
    ...scope,
    ...(effectiveStatus ? { status: effectiveStatus } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(ministry ? { ministry: { contains: ministry, mode: "insensitive" as const } } : {}),
    ...(fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {})
          }
        }
      : {}),
    ...(search
      ? {
          OR: [
            { blockchainTxHash: { contains: search, mode: "insensitive" as const } },
            { localHash: { contains: search, mode: "insensitive" as const } },
            { toName: { contains: search, mode: "insensitive" as const } },
            { fromWallet: { contains: search, mode: "insensitive" as const } },
            { toWallet: { contains: search, mode: "insensitive" as const } }
          ]
        }
      : {})
  };

  const [total, rows] = await prisma.$transaction([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      include: {
        department: true,
        initiatedBy: { select: { id: true, name: true, email: true, role: true } },
        ...(includeFlags ? { flags: { where: { isResolved: false }, take: 5 } } : {}),
        ...(includeApprovals
          ? { approvals: { include: { user: { select: { id: true, name: true, role: true } } } } }
          : {})
      }
    })
  ]);

  res.status(200).json({
    data: rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0
    }
  });
});

export const getTransactionController = asyncHandler(async (req: Request, res: Response) => {
  const scope = transactionListWhereForRole(req.user!);
  if (scope === null) throw new AppError("FORBIDDEN", "Insufficient permissions", 403);

  const tx = await prisma.transaction.findUnique({
    where: { id: req.params.id },
    include: {
      department: { include: { ministry: true } },
      initiatedBy: { select: { id: true, name: true, email: true, role: true, walletAddress: true } },
      approvals: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      flags: true
    }
  });
  if (!tx) throw new AppError("NOT_FOUND", "Transaction not found", 404);
  if (Object.keys(scope).length > 0) {
    const allowed = await prisma.transaction.count({ where: { id: tx.id, ...scope } });
    if (!allowed) throw new AppError("FORBIDDEN", "Insufficient permissions", 403);
  }

  res.status(200).json({ transaction: tx });
});

export const patchTransactionStatusController = asyncHandler(async (req: Request, res: Response) => {
  const body = patchStatusSchema.parse(req.body);
  const tx = await prisma.transaction.update({
    where: { id: req.params.id },
    data: { status: body.status }
  });
  res.status(200).json({ transaction: tx });
});

export const auditTrailController = asyncHandler(async (req: Request, res: Response) => {
  const scope = transactionListWhereForRole(req.user!);
  if (scope === null) throw new AppError("FORBIDDEN", "Insufficient permissions", 403);
  if (Object.keys(scope).length > 0) {
    const ok = await prisma.transaction.count({ where: { id: req.params.id, ...scope } });
    if (!ok) throw new AppError("FORBIDDEN", "Insufficient permissions", 403);
  }

  const logs = await prisma.auditLog.findMany({
    where: { transactionId: req.params.id },
    orderBy: { createdAt: "asc" }
  });
  res.status(200).json({ data: logs });
});

export const exportTransactionsCsvController = asyncHandler(async (req: Request, res: Response) => {
  const scope = transactionListWhereForRole(req.user!);
  if (scope === null) {
    throw new AppError("FORBIDDEN", "Insufficient permissions", 403);
  }

  const rows = await prisma.transaction.findMany({
    where: scope,
    orderBy: { createdAt: "desc" },
    take: 10_000,
    include: { department: true }
  });

  const header = [
    "id",
    "createdAt",
    "status",
    "amountPaise",
    "fromWallet",
    "toWallet",
    "toName",
    "department",
    "ministry",
    "blockchainTxHash"
  ].join(",");

  const escape = (v: string | number | bigint | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = rows.map((r) =>
    [
      escape(r.id),
      escape(r.createdAt.toISOString()),
      escape(r.status),
      escape(r.amount),
      escape(r.fromWallet),
      escape(r.toWallet),
      escape(r.toName),
      escape(r.department.name),
      escape(r.ministry),
      escape(r.blockchainTxHash)
    ].join(",")
  );

  const csv = [header, ...lines].join("\n");
  res.header("Content-Type", "text/csv");
  res.header("Content-Disposition", 'attachment; filename="transactions.csv"');
  res.status(200).send(csv);
});
