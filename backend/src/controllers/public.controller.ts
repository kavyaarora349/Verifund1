import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { publicSummary } from "../services/reports.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const publicSummaryController = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await publicSummary();
  res.status(200).json(summary);
});

export const publicMinistriesController = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await publicSummary();
  res.status(200).json({ ministries: summary.ministries });
});

export const publicLastSyncController = asyncHandler(async (_req: Request, res: Response) => {
  const latest = await prisma.transaction.findFirst({
    where: { onChainAt: { not: null } },
    orderBy: { onChainAt: "desc" },
    select: { onChainAt: true }
  });
  res.status(200).json({
    lastSyncedAt: latest?.onChainAt?.toISOString() ?? null
  });
});
