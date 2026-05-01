import { Redis, type RedisOptions } from "ioredis";
import { URL } from "node:url";
import { env } from "./env.js";

function optionsFromUrl(urlStr: string): RedisOptions {
  const u = new URL(urlStr);
  const dbPath = u.pathname && u.pathname !== "/" ? u.pathname.slice(1) : "0";
  const db = Number(dbPath);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    password: u.password || undefined,
    username: u.username || undefined,
    db: Number.isFinite(db) ? db : 0,
    lazyConnect: true,
    maxRetriesPerRequest: null
  };
}

/** BullMQ + shared commands use the same option bag (separate TCP connections). */
export const redisConnection: RedisOptions = optionsFromUrl(env.REDIS_URL);

export const redisClient = new Redis(redisConnection);
redisClient.on("error", () => {
  // Redis is optional in local dev when queue worker is disabled.
});
