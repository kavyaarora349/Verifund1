import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/db.js";

function routeEntity(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const v1 = parts.indexOf("v1");
  return parts[v1 + 1] ?? "Unknown";
}

export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  res.on("finish", () => {
    if (req.method === "GET") return;
    if (res.statusCode >= 400) return;
    void prisma.auditLog
      .create({
        data: {
          userId: req.user?.id ?? null,
          action: `${req.method} ${req.originalUrl}`,
          entity: routeEntity(req.path),
          entityId: typeof req.params?.id === "string" ? req.params.id : undefined,
          transactionId:
            typeof req.params?.transactionId === "string" ? req.params.transactionId : undefined,
          metadata: { query: req.query },
          ipAddress: req.ip,
          userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined
        }
      })
      .catch(() => {});
  });
  next();
}
