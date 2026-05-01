import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { dashboardStats, publicSummary } from "../services/reports.service.js";
import { getAuditPdfJob, queueAuditPdfExport } from "../services/reportsExport.store.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const auditReportDataController = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await dashboardStats();
  const recentFlags = await prisma.flag.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { transaction: { select: { id: true, amount: true, toName: true, ministry: true } } }
  });
  res.status(200).json({ stats, recentFlags });
});

export const auditExportQueueController = asyncHandler(async (_req: Request, res: Response) => {
  const { jobId } = queueAuditPdfExport();
  res.status(202).json({ jobId, status: "queued" });
});

export const auditExportDownloadController = asyncHandler(async (req: Request, res: Response) => {
  const job = getAuditPdfJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Job not found", statusCode: 404 } });
    return;
  }
  res.status(200).json({
    jobId: req.params.jobId,
    status: job.status,
    message: job.message
  });
});

export const dashboardStatsController = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await dashboardStats();
  res.status(200).json(stats);
});

export const publicSummaryReportController = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await publicSummary();
  res.status(200).json(summary);
});
