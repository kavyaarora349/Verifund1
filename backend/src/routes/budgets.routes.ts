import { Router } from "express";
import {
  approveAllocationRequestController,
  allocateBudgetController,
  budgetAlertsController,
  createAllocationRequestController,
  departmentBudgetController,
  listBudgetsController,
  listAllocationRequestsController,
  ministryBudgetController,
  patchDepartmentBudgetController
} from "../controllers/budgets.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

export const budgetsRouter = Router();

budgetsRouter.use(authenticate);

const readers = authorize("ADMIN", "AUDITOR", "FINANCE_OFFICER", "DEPT_HEAD");

budgetsRouter.get("/", readers, listBudgetsController);
budgetsRouter.get("/ministry/:id", readers, ministryBudgetController);
budgetsRouter.get("/department/:id", readers, departmentBudgetController);
budgetsRouter.get("/alerts", readers, budgetAlertsController);
budgetsRouter.get("/requests", authorize("ADMIN", "FINANCE_OFFICER", "DEPT_HEAD", "AUDITOR"), listAllocationRequestsController);
budgetsRouter.post("/requests", authorize("DEPT_HEAD", "AUDITOR"), createAllocationRequestController);
budgetsRouter.post("/requests/:requestId/approve", authorize("ADMIN", "FINANCE_OFFICER", "DEPT_HEAD"), approveAllocationRequestController);
budgetsRouter.post("/allocate", authorize("ADMIN", "FINANCE_OFFICER"), allocateBudgetController);
budgetsRouter.patch("/department/:id", authorize("ADMIN", "FINANCE_OFFICER"), patchDepartmentBudgetController);
