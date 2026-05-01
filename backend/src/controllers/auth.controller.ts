import { z } from "zod";
import type { Request, Response } from "express";
import {
  login,
  logout,
  refreshTokens,
  walletVerifyPlaceholder
} from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

export const loginController = asyncHandler(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);
  const result = await login(body.email, body.password);
  res.status(200).json(result);
});

export const refreshController = asyncHandler(async (req: Request, res: Response) => {
  const body = refreshSchema.parse(req.body);
  const result = await refreshTokens(body.refreshToken);
  res.status(200).json(result);
});

export const logoutController = asyncHandler(async (req: Request, res: Response) => {
  const body = refreshSchema.parse(req.body);
  await logout(body.refreshToken);
  res.status(204).send();
});

export const walletVerifyController = asyncHandler(async (_req: Request, res: Response) => {
  const result = await walletVerifyPlaceholder();
  res.status(200).json(result);
});

export const meController = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ user: req.user });
});
