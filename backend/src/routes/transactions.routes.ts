import { Router } from "express";
import {
  auditTrailController,
  createTransactionController,
  exportTransactionsCsvController,
  getTransactionController,
  listTransactionsController,
  patchTransactionStatusController
} from "../controllers/transactions.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { txCreateLimiter } from "../middleware/rateLimiter.js";

export const transactionsRouter = Router();

const txReaders = authorize("ADMIN", "AUDITOR", "FINANCE_OFFICER", "DEPT_HEAD");

transactionsRouter.get("/export", authenticate, authorize("AUDITOR"), exportTransactionsCsvController);
transactionsRouter.get("/", authenticate, txReaders, listTransactionsController);
transactionsRouter.get("/:id/audit-trail", authenticate, txReaders, auditTrailController);
transactionsRouter.patch("/:id/status", authenticate, authorize("ADMIN", "AUDITOR"), patchTransactionStatusController);
transactionsRouter.get("/:id", authenticate, txReaders, getTransactionController);
transactionsRouter.post(
  "/",
  authenticate,
  authorize("ADMIN", "FINANCE_OFFICER"),
  txCreateLimiter,
  createTransactionController
);
