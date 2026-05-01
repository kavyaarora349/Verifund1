import { Router } from "express";
import {
  auditExportDownloadController,
  auditExportQueueController,
  auditReportDataController,
  dashboardStatsController,
  publicSummaryReportController
} from "../controllers/reports.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

export const reportsRouter = Router();

const readers = authorize("ADMIN", "AUDITOR", "FINANCE_OFFICER", "DEPT_HEAD");

reportsRouter.get("/audit", authenticate, readers, auditReportDataController);
reportsRouter.post("/audit/export", authenticate, authorize("ADMIN", "AUDITOR"), auditExportQueueController);
reportsRouter.get("/audit/download/:jobId", authenticate, authorize("ADMIN", "AUDITOR"), auditExportDownloadController);
reportsRouter.get("/dashboard/stats", authenticate, readers, dashboardStatsController);
reportsRouter.get("/public/summary", publicSummaryReportController);
