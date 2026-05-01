import type { FlagSeverity } from "@prisma/client";
import { z } from "zod";
import type { Request, Response } from "express";
import {
  flagFeed,
  flagStats,
  getFlag,
  listFlags,
  resolveFlag
} from "../services/flags.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parsePagination } from "../utils/pagination.js";

const resolveSchema = z.object({
  resolution: z.enum(["CLEARED", "ESCALATED", "REJECTED_TX"]),
  note: z.string().optional()
});

export const listFlagsController = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const severity =
    typeof req.query.severity === "string" ? (req.query.severity as FlagSeverity) : undefined;
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const isResolved =
    req.query.isResolved === "true" ? true : req.query.isResolved === "false" ? false : undefined;
  const fromDate =
    typeof req.query.fromDate === "string" ? new Date(req.query.fromDate) : undefined;
  const toDate = typeof req.query.toDate === "string" ? new Date(req.query.toDate) : undefined;

  const { total, data } = await listFlags({
    severity,
    category,
    isResolved,
    fromDate,
    toDate,
    skip,
    take: limit
  });

  res.status(200).json({
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 }
  });
});

export const getFlagController = asyncHandler(async (req: Request, res: Response) => {
  const flag = await getFlag(req.params.id);
  res.status(200).json({ flag });
});

export const resolveFlagController = asyncHandler(async (req: Request, res: Response) => {
  const body = resolveSchema.parse(req.body);
  const flag = await resolveFlag(req.params.id, req.user!.id, body.resolution, body.note);
  res.status(200).json({ flag });
});

export const flagStatsController = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await flagStats();
  res.status(200).json(stats);
});

export const flagFeedController = asyncHandler(async (_req: Request, res: Response) => {
  const feed = await flagFeed();
  res.status(200).json({ data: feed });
});
