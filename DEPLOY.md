# Deploy VeriFund (frontend + API)

You deploy **two pieces**: the **API** (Docker / Node) and the **static UI** (Vite build). They talk over HTTPS using `VITE_API_BASE_URL`.

## 1. Redis

The API expects **`REDIS_URL`** (BullMQ fraud worker when `RUN_QUEUE_WORKER=true`).

- Easiest free tier: [Upstash Redis](https://upstash.com/) → create a database → copy the **rediss://** URL into `REDIS_URL`.

## 2. PostgreSQL (Supabase)

Use your existing Supabase project:

- **`DATABASE_URL`** — pooler URL (often port `5432` / `6543` with `pgbouncer=true` if you use the pooler).
- **`DIRECT_URL`** — non-pooler URL for Prisma migrations (`prisma migrate deploy` in Docker). Supabase dashboard lists both under *Database settings → Connection string*.

If migrations fail on the pooler, point **`DIRECT_URL`** at the **direct** Postgres connection.

## 3. API on Render

1. [Render](https://render.com) → **New** → **Blueprint** → connect this Git repo, or **Web Service** → **Docker**.
2. **Root directory**: repository root (leave empty / default).
3. **Dockerfile path**: `backend/Dockerfile`
4. **Docker build context**: `backend`
5. **Health check path**: `/healthz`
6. Under **Environment**, add (from `backend/.env.example`):

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Supabase pooled |
| `DIRECT_URL` | Supabase direct (migrations) |
| `REDIS_URL` | Upstash `rediss://…` |
| `JWT_SECRET` | ≥16 chars, random |
| `JWT_REFRESH_SECRET` | ≥16 chars, random |
| `NODE_ENV` | `production` |
| `RUN_QUEUE_WORKER` | `true` if Redis works; else `false` (worker off; fraud paths still assume Redis/BullMQ availability where used — prefer Redis) |
| `SOCKET_CORS_ORIGINS` | Your Vercel URL, e.g. `https://your-app.vercel.app` or `*` for testing |

Render sets **`PORT`** automatically; the app already reads `process.env.PORT`.

After deploy, note the API URL, e.g. `https://verifund-api.onrender.com`.

**Optional seed:** In Render Shell (or locally with prod `DATABASE_URL`):

```bash
cd backend && npx prisma db seed
```

## 4. Frontend on Vercel

1. [Vercel](https://vercel.com) → **Add New Project** → import this repo.
2. **Framework preset**: Vite (or Other + settings below).
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Environment Variables** (Production):

| Name | Value |
|------|--------|
| `VITE_API_BASE_URL` | `https://YOUR-RENDER-SERVICE.onrender.com/api/v1` |

Redeploy after changing env vars (they are baked in at build time).

`vercel.json` includes SPA rewrites so client-side routes work.

## 5. Smoke test

- Open `https://YOUR-API/healthz` → `{"status":"ok"}`
- Open the Vercel site → login page loads → login hits the API URL you set.

## Troubleshooting

- **CORS**: API uses open `cors()`; if issues persist, check browser mixed content (HTTPS site → HTTP API).
- **Sockets**: Set `SOCKET_CORS_ORIGINS` to your exact Vercel origin if live updates fail.
- **Cold start**: Render free tier sleeps; first request can take ~30–60s.
