import path from "node:path";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { adminRouter } from "./routes/admin.routes.js";
import { approvalsRouter } from "./routes/approvals.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { budgetsRouter } from "./routes/budgets.routes.js";
import { flagsRouter } from "./routes/flags.routes.js";
import { publicRouter } from "./routes/public.routes.js";
import { reportsRouter } from "./routes/reports.routes.js";
import { transactionsRouter } from "./routes/transactions.routes.js";
import { usersRouter } from "./routes/users.routes.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { auditLogger } from "./middleware/auditLogger.js";
import { bigIntJsonMiddleware } from "./middleware/bigIntJson.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(bigIntJsonMiddleware);
app.use(apiLimiter);
app.use(auditLogger);

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

const p = env.API_PREFIX;

app.use(`${p}/auth`, authRouter);
app.use(`${p}/transactions`, transactionsRouter);
app.use(`${p}/approvals`, approvalsRouter);
app.use(`${p}/budgets`, budgetsRouter);
app.use(`${p}/flags`, flagsRouter);
app.use(`${p}/reports`, reportsRouter);
app.use(`${p}/users`, usersRouter);
app.use(`${p}/admin`, adminRouter);
app.use(`${p}/public`, publicRouter);

/** Vercel serverless: non-API GETs (no static file on CDN) are rewritten here — SPA fallback. */
if (process.env.VERCEL) {
  const distDir = path.join(process.cwd(), "dist");
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith(p) || req.path === "/healthz") return next();
    res.sendFile(path.join(distDir, "index.html"), (err) => (err ? next(err) : undefined));
  });
}

app.use(errorHandler);
