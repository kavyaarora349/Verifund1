import { Router } from "express";
import {
  createBlacklistController,
  deleteBlacklistController,
  listAuditLogsAdminController,
  listBlacklistController,
  listFraudRulesController,
  patchFraudRuleController,
  systemHealthController
} from "../controllers/admin.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

export const adminRouter = Router();

adminRouter.use(authenticate, authorize("ADMIN"));

adminRouter.get("/system/health", systemHealthController);
adminRouter.get("/blacklist", listBlacklistController);
adminRouter.post("/blacklist", createBlacklistController);
adminRouter.delete("/blacklist/:id", deleteBlacklistController);
adminRouter.get("/fraud-rules", listFraudRulesController);
adminRouter.patch("/fraud-rules/:name", patchFraudRuleController);
adminRouter.get("/audit-logs", listAuditLogsAdminController);
