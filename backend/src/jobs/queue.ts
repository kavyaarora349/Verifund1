import { Queue } from "bullmq";
import { redisConnection, redisDisabled } from "../config/redis.js";

export const fraudCheckQueue: Queue<{ transactionId: string }> | null = redisDisabled
  ? null
  : new Queue<{ transactionId: string }>("fraudCheck", {
      connection: redisConnection
    });

export async function enqueueFraudCheck(transactionId: string): Promise<void> {
  if (!fraudCheckQueue) {
    throw new Error("enqueueFraudCheck requires Redis (unset SKIP_REDIS or set RUN_QUEUE_WORKER=false everywhere)");
  }
  await fraudCheckQueue.add(
    "analyze",
    { transactionId },
    {
      attempts: 5,
      backoff: { type: "exponential", delay: 1500 },
      removeOnComplete: 1000,
      removeOnFail: 5000
    }
  );
}
