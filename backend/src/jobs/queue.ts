import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

export const fraudCheckQueue = new Queue<{ transactionId: string }>("fraudCheck", {
  connection: redisConnection
});

export async function enqueueFraudCheck(transactionId: string): Promise<void> {
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
