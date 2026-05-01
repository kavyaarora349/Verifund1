import type { Prisma } from "@prisma/client";
import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { redisClient } from "../config/redis.js";
import { verifyAlgorandReachable } from "../services/blockchain/algorand.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parsePagination } from "../utils/pagination.js";
import { AppError } from "../utils/appError.js";

const blacklistSchema = z.object({
  walletAddress: z.string().optional(),
  vendorName: z.string().optional(),
  reason: z.string().min(3)
});

const fraudRulePatchSchema = z.object({
  isEnabled: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional()
});

export const systemHealthController = asyncHandler(async (_req: Request, res: Response) => {
  const [db, redis] = await Promise.allSettled([prisma.$queryRaw`SELECT 1`, redisClient.ping()]);
  const algorandOk = await verifyAlgorandReachable();

  res.status(200).json({
    database: db.status === "fulfilled" ? "UP" : "DOWN",
    redis: redis.status === "fulfilled" ? "UP" : "DOWN",
    blockchain: {
      algorand: algorandOk ? "UP" : env.ALGORAND_NODE_URL ? "DOWN" : "NOT_CONFIGURED",
      fabric: "NOT_CONFIGURED"
    },
    checkedAt: new Date().toISOString()
  });
});

export const listBlacklistController = asyncHandler(async (_req: Request, res: Response) => {
  const items = await prisma.blacklist.findMany({ orderBy: { createdAt: "desc" } });
  res.status(200).json({ data: items });
});

export const createBlacklistController = asyncHandler(async (req: Request, res: Response) => {
  const body = blacklistSchema.parse(req.body);
  if (!body.walletAddress && !body.vendorName) {
    throw new AppError("VALIDATION_ERROR", "walletAddress or vendorName required", 422);
  }
  const row = await prisma.blacklist.create({
    data: {
      walletAddress: body.walletAddress ?? null,
      vendorName: body.vendorName ?? null,
      reason: body.reason,
      addedById: req.user!.id
    }
  });
  res.status(201).json({ blacklist: row });
});

export const deleteBlacklistController = asyncHandler(async (req: Request, res: Response) => {
  await prisma.blacklist.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export const listFraudRulesController = asyncHandler(async (_req: Request, res: Response) => {
  const rules = await prisma.fraudRule.findMany({ orderBy: { name: "asc" } });
  res.status(200).json({ data: rules });
});

export const patchFraudRuleController = asyncHandler(async (req: Request, res: Response) => {
  const body = fraudRulePatchSchema.parse(req.body);
  const data: Prisma.FraudRuleUpdateInput = {};
  if (body.isEnabled !== undefined) data.isEnabled = body.isEnabled;
  if (body.config !== undefined) data.config = body.config as Prisma.InputJsonValue;
  if (Object.keys(data).length === 0) {
    throw new AppError("VALIDATION_ERROR", "No updates supplied", 422);
  }
  const rule = await prisma.fraudRule.update({
    where: { name: req.params.name },
    data
  });
  res.status(200).json({ rule });
});

export const listAuditLogsAdminController = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [total, data] = await prisma.$transaction([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { user: { select: { id: true, email: true, role: true } } }
    })
  ]);
  res.status(200).json({
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 }
  });
});
