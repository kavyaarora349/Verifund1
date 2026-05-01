import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { prisma } from "../../config/db.js";
import { env } from "../../config/env.js";
import { serializeBigIntDeep } from "../../utils/jsonSerialize.js";

let io: Server | null = null;

export function attachSocket(httpServer: HttpServer): Server {
  const origins = env.SOCKET_CORS_ORIGINS.split(",").map((s) => s.trim());
  io = new Server(httpServer, {
    cors: {
      origin: origins.includes("*") ? true : origins,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        next(new Error("Unauthorized"));
        return;
      }
      const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, role: true, department: true, isActive: true }
      });
      if (!user?.isActive) {
        next(new Error("Forbidden"));
        return;
      }
      socket.data.user = user;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as { id: string; role: string; department: string | null };
    socket.join(`role:${user.role}`);
    socket.join(`user:${user.id}`);
    if (user.department) socket.join(`dept:${user.department}`);
  });

  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, serializeBigIntDeep(payload));
}

export function emitFlagNew(payload: { flag: unknown; transaction: unknown }): void {
  if (!io) return;
  const body = serializeBigIntDeep(payload);
  io.to("role:ADMIN").to("role:AUDITOR").to("role:FINANCE_OFFICER").emit("flag:new", body);
  const deptName = (payload.transaction as { department?: { name?: string } })?.department?.name;
  if (deptName) io.to(`dept:${deptName}`).emit("flag:new", body);
}

export function emitTxConfirmed(payload: unknown): void {
  io?.emit("tx:confirmed", serializeBigIntDeep(payload));
}

export function emitTxFlagged(payload: unknown): void {
  io?.to("role:ADMIN").to("role:AUDITOR").emit("tx:flagged", serializeBigIntDeep(payload));
}

export function emitApprovalNeeded(payload: unknown): void {
  io?.emit("approval:needed", serializeBigIntDeep(payload));
}
