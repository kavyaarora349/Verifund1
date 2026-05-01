import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/appError.js";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "AUDITOR", "FINANCE_OFFICER", "DEPT_HEAD", "PUBLIC"]),
  department: z.string().optional(),
  ministry: z.string().optional(),
  walletAddress: z.string().optional()
});

const patchUserSchema = z.object({
  role: z.enum(["ADMIN", "AUDITOR", "FINANCE_OFFICER", "DEPT_HEAD", "PUBLIC"]).optional(),
  department: z.string().nullable().optional(),
  ministry: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  walletAddress: z.string().nullable().optional()
});

export const listUsersController = asyncHandler(async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      ministry: true,
      walletAddress: true,
      isActive: true,
      createdAt: true
    }
  });
  res.status(200).json({ data: users });
});

export const createUserController = asyncHandler(async (req: Request, res: Response) => {
  const body = createUserSchema.parse(req.body);
  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) throw new AppError("VALIDATION_ERROR", "Email already in use", 422, "email");

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash,
      role: body.role as Role,
      department: body.department,
      ministry: body.ministry,
      walletAddress: body.walletAddress
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      ministry: true,
      walletAddress: true,
      isActive: true
    }
  });
  res.status(201).json({ user });
});

export const patchUserController = asyncHandler(async (req: Request, res: Response) => {
  const body = patchUserSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(body.role !== undefined ? { role: body.role as Role } : {}),
      ...(body.department !== undefined ? { department: body.department ?? undefined } : {}),
      ...(body.ministry !== undefined ? { ministry: body.ministry ?? undefined } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.walletAddress !== undefined ? { walletAddress: body.walletAddress ?? undefined } : {})
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      ministry: true,
      walletAddress: true,
      isActive: true
    }
  });
  res.status(200).json({ user });
});

export const deleteUserController = asyncHandler(async (req: Request, res: Response) => {
  await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false }
  });
  res.status(204).send();
});
