import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";

/** Maps renamed demo domain so existing seeded users still authenticate. */
function alternateLoginEmail(email: string): string | null {
  const e = email.trim().toLowerCase();
  if (e.endsWith("@verifund.gov.in")) {
    return e.replace(/@verifund\.gov\.in$/i, "@publedger.gov.in");
  }
  if (e.endsWith("@publedger.gov.in")) {
    return e.replace(/@publedger\.gov\.in$/i, "@verifund.gov.in");
  }
  return null;
}

async function findUserForLogin(email: string) {
  const normalized = email.trim().toLowerCase();
  let user = await prisma.user.findUnique({ where: { email: normalized } });
  if (user) return user;
  const alt = alternateLoginEmail(normalized);
  if (alt) {
    user = await prisma.user.findUnique({ where: { email: alt } });
  }
  return user;
}

export async function login(email: string, password: string) {
  const user = await findUserForLogin(email);
  if (!user) throw new AppError("UNAUTHORIZED", "Invalid email or password", 401);
  if (!user.isActive) throw new AppError("FORBIDDEN", "Account deactivated", 403);

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) throw new AppError("UNAUTHORIZED", "Invalid email or password", 401);

  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      department: user.department,
      ministry: user.ministry,
      walletAddress: user.walletAddress,
      isActive: user.isActive
    },
    env.JWT_SECRET,
    {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
    }
  );
  const refreshToken = jwt.sign({ userId: user.id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
    jwtid: randomUUID()
  });

  const decoded = jwt.decode(refreshToken);
  const expSec =
    decoded && typeof decoded === "object" && "exp" in decoded && typeof decoded.exp === "number"
      ? decoded.exp
      : Math.floor(Date.now() / 1000) + 7 * 24 * 3600;

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(expSec * 1000)
    }
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      walletAddress: user.walletAddress
    }
  };
}

export async function refreshTokens(refreshToken: string) {
  let payload: { userId: string };
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };
  } catch {
    throw new AppError("UNAUTHORIZED", "Invalid refresh token", 401);
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.expiresAt.getTime() < Date.now()) {
    throw new AppError("UNAUTHORIZED", "Refresh token revoked or expired", 401);
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user?.isActive) throw new AppError("FORBIDDEN", "Account deactivated", 403);

  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      department: user.department,
      ministry: user.ministry,
      walletAddress: user.walletAddress,
      isActive: user.isActive
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
    }
  );

  return { accessToken };
}

export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}

/** Stub for v1 — wire algosdk Message.verify when frontend sends structured payloads. */
export async function walletVerifyPlaceholder(): Promise<{ ok: boolean; message: string }> {
  return { ok: false, message: "Wallet verification endpoint reserved for Algorand signature checks in v1" };
}
