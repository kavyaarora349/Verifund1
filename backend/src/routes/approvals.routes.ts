import { Router } from "express";
import {
  getApprovalsForTxController,
  listMyApprovalsController,
  rejectApprovalController,
  signApprovalController
} from "../controllers/approvals.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

export const approvalsRouter = Router();

approvalsRouter.use(authenticate);

approvalsRouter.get("/", authorize("ADMIN", "AUDITOR", "FINANCE_OFFICER", "DEPT_HEAD"), listMyApprovalsController);
approvalsRouter.get("/:transactionId", authorize("ADMIN", "AUDITOR", "FINANCE_OFFICER", "DEPT_HEAD"), getApprovalsForTxController);
approvalsRouter.post("/:transactionId/sign", authorize("ADMIN", "FINANCE_OFFICER", "DEPT_HEAD"), signApprovalController);
approvalsRouter.post("/:transactionId/reject", authorize("ADMIN", "FINANCE_OFFICER", "DEPT_HEAD"), rejectApprovalController);
