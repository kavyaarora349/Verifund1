import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";

type JwtPayload = { userId: string };

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    next(new AppError("UNAUTHORIZED", "No token provided", 401));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload & {
      email?: string;
      role?: string;
      department?: string | null;
      ministry?: string | null;
      name?: string;
      walletAddress?: string | null;
      isActive?: boolean;
    };

    // Fast path: modern access tokens already contain all required user claims.
    if (
      payload.userId &&
      payload.email &&
      payload.role &&
      payload.name &&
      payload.isActive === true
    ) {
      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        department: payload.department ?? null,
        ministry: payload.ministry ?? null,
        name: payload.name,
        walletAddress: payload.walletAddress ?? null,
        isActive: true
      };
      next();
      return;
    }

    // Backward compatibility: old tokens still resolve through DB.
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        department: true,
        ministry: true,
        name: true,
        walletAddress: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      next(new AppError("FORBIDDEN", "Account deactivated", 403));
      return;
    }

    req.user = user;
    next();
  } catch {
    next(new AppError("UNAUTHORIZED", "Invalid or expired token", 401));
  }
}
