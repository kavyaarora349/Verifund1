import type { Role, User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: Pick<
        User,
        "id" | "email" | "role" | "department" | "ministry" | "name" | "walletAddress" | "isActive"
      >;
    }
  }
}

export type AppRole = Role;
