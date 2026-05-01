import http from "node:http";
import { app } from "./app.js";
import { prisma } from "./config/db.js";
import { env } from "./config/env.js";
import { redisClient } from "./config/redis.js";
import { fraudCheckQueue } from "./jobs/queue.js";
import { createFraudWorker } from "./jobs/fraudCheck.worker.js";
import { attachSocket } from "./services/notifications/socket.service.js";

const server = http.createServer(app);
attachSocket(server);

let fraudWorker: ReturnType<typeof createFraudWorker> | undefined;

if (env.RUN_QUEUE_WORKER) {
  fraudWorker = createFraudWorker();
  fraudWorker.on("failed", (job, err) => {
    console.error(`fraud job ${job?.id} failed`, err);
  });
}

server.listen(env.PORT, () => {
  console.log(`VeriFund API + Socket.IO on :${env.PORT} (${env.RUN_QUEUE_WORKER ? "worker on" : "inline fraud"})`);
});

async function shutdown(signal: string): Promise<void> {
  console.info(`${signal}: shutting down`);
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await fraudWorker?.close();
  await fraudCheckQueue.close();
  await redisClient.quit();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
