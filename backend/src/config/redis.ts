import { Redis, type RedisOptions } from "ioredis";
import { URL } from "node:url";
import { env } from "./env.js";

/** Strips accidental `redis-cli --tls -u` prefix if REDIS_URL was copy-pasted wrong. */
export function normalizeRedisUrl(raw: string): string {
  const s = raw.trim();
  const i = s.search(/rediss?:\/\//i);
  if (i < 0) return s;
  let url = s.slice(i);
  const sp = url.search(/\s/);
  if (sp >= 0) url = url.slice(0, sp);
  return url.replace(/^['"]|['"]$/g, "");
}

function optionsFromUrl(urlStr: string): RedisOptions {
  const u = new URL(normalizeRedisUrl(urlStr));
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
redisClient.on("error", (err) => {
  console.error("Redis client error (is Redis running? REDIS_URL correct?)", err.message);
});
