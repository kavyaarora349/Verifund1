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

/** No local Redis: stub client + skip BullMQ (see SKIP_REDIS in `.env`). */
export const redisDisabled = env.SKIP_REDIS;

function stubRedis() {
  const s = {
    ping: () => Promise.resolve("PONG"),
    quit: () => Promise.resolve("OK"),
    disconnect: () => Promise.resolve(),
    on: () => s
  };
  return s as unknown as InstanceType<typeof Redis>;
}

export const redisConnection: RedisOptions = redisDisabled
  ? { host: "127.0.0.1", port: 6379, lazyConnect: true, maxRetriesPerRequest: null }
  : optionsFromUrl(env.REDIS_URL);

export const redisClient = redisDisabled ? stubRedis() : new Redis(optionsFromUrl(env.REDIS_URL));

if (!redisDisabled) {
  redisClient.on("error", (err: Error) => {
    console.error("Redis client error (is Redis running? REDIS_URL correct?)", err.message);
  });
}
