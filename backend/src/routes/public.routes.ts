import { Router } from "express";
import {
  publicLastSyncController,
  publicMinistriesController,
  publicSummaryController
} from "../controllers/public.controller.js";

export const publicRouter = Router();

publicRouter.get("/summary", publicSummaryController);
publicRouter.get("/ministries", publicMinistriesController);
publicRouter.get("/last-sync", publicLastSyncController);
