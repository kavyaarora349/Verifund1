import { config } from "dotenv";
import { z } from "zod";

config();

const schema = z
  .object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default("/api/v1"),
  DATABASE_URL: z.string().min(1),
  /** Set `SKIP_REDIS=true` for local dev when Redis is not installed (no BullMQ worker; fraud runs inline). */
  SKIP_REDIS: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  FLAG_AMOUNT_MULTIPLIER: z.coerce.number().default(3.4),
  FLAG_VELOCITY_COUNT: z.coerce.number().default(2),
  FLAG_VELOCITY_WINDOW_HOURS: z.coerce.number().default(6),
  FLAG_WORKING_HOURS_START: z.coerce.number().default(9),
  FLAG_WORKING_HOURS_END: z.coerce.number().default(18),
  SOCKET_CORS_ORIGINS: z.string().default("*"),
  RUN_QUEUE_WORKER: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
  LEDGER_ALGORAND_THRESHOLD_PAISE: z.string().default("1000000000"),
  ALGORAND_NODE_URL: z.string().optional(),
  ALGORAND_INDEXER_URL: z.string().optional(),
  ALGORAND_ADMIN_MNEMONIC: z.string().optional(),
  ALGORAND_DEPT_HEAD_MNEMONIC: z.string().optional()
})
  .superRefine((data, ctx) => {
    if (!data.SKIP_REDIS && (!data.REDIS_URL || data.REDIS_URL.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "REDIS_URL is required unless SKIP_REDIS=true (use SKIP_REDIS=true for local dev without Redis)",
        path: ["REDIS_URL"]
      });
    }
  });

const parsed = schema.parse(process.env);

export const env = {
  ...parsed,
  REDIS_URL: parsed.REDIS_URL ?? "",
  RUN_QUEUE_WORKER: parsed.SKIP_REDIS ? false : parsed.RUN_QUEUE_WORKER,
  ledgerAlgorandThresholdPaise: BigInt(parsed.LEDGER_ALGORAND_THRESHOLD_PAISE)
};
