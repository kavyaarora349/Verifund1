import { Router } from "express";
import {
  loginController,
  logoutController,
  meController,
  refreshController,
  walletVerifyController
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authLimiter } from "../middleware/rateLimiter.js";

export const authRouter = Router();

authRouter.post("/login", authLimiter, loginController);
authRouter.post("/refresh", authLimiter, refreshController);
authRouter.post("/logout", authLimiter, logoutController);
authRouter.post("/wallet-verify", walletVerifyController);
authRouter.get("/me", authenticate, meController);
