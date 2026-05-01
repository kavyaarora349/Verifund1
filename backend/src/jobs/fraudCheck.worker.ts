import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { runFraudChecksWithSideEffects } from "../services/fraud/detector.service.js";

export function createFraudWorker(): Worker<{ transactionId: string }> {
  return new Worker<{ transactionId: string }>(
    "fraudCheck",
    async (job) => {
      await runFraudChecksWithSideEffects(job.data.transactionId);
    },
    { connection: redisConnection }
  );
}
