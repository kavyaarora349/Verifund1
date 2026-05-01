import { Router } from "express";
import {
  flagFeedController,
  flagStatsController,
  getFlagController,
  listFlagsController,
  resolveFlagController
} from "../controllers/flags.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

export const flagsRouter = Router();

flagsRouter.use(authenticate);

const readers = authorize("ADMIN", "AUDITOR", "FINANCE_OFFICER", "DEPT_HEAD");

flagsRouter.get("/", readers, listFlagsController);
flagsRouter.get("/stats", readers, flagStatsController);
flagsRouter.get("/feed", readers, flagFeedController);
flagsRouter.get("/:id", readers, getFlagController);
flagsRouter.patch("/:id/resolve", authorize("ADMIN", "AUDITOR", "FINANCE_OFFICER"), resolveFlagController);
