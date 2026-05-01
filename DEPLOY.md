# Deploy VeriFund on Vercel (full stack)

One project deploys **static UI + Express API** together:

- `dist/` is served as static assets (JS/CSS).
- Anything that isn’t a static file is rewritten to a **single serverless function** that runs your existing Express `app` (`api/index.ts` + `serverless-http`).
- The UI calls **`/api/v1`** on the **same hostname** (no `VITE_API_BASE_URL` required).

## Limitations vs a long‑running server

- **Socket.IO** is not running (only `server.ts` attaches it). Live notification sockets won’t connect; the rest of the app still works.
- **BullMQ worker** doesn’t run on serverless. Set **`RUN_QUEUE_WORKER=false`** so fraud checks run **inline** (already supported).
- **Cold starts** on the free tier can add a few seconds on the first request after idle.

## 1. Prepare Redis

Use **[Upstash](https://upstash.com)** (or similar) and copy the **`rediss://`** URL → **`REDIS_URL`** in Vercel.

## 2. Import the repo on Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import this repository.
2. Framework / settings are driven by **`vercel.json`** (`buildCommand`, `outputDirectory`, `rewrites`).
3. **Install Command**: `npm ci && cd backend && npm ci` (already in `vercel.json`).

## 3. Environment variables (Production — also enable for “Build” where noted)

| Variable | Example / notes |
|----------|------------------|
| `DATABASE_URL` | Supabase **pooler** URL |
| `DIRECT_URL` | Supabase **direct** URL (Prisma migrations in build) |
| `REDIS_URL` | Upstash `rediss://…` |
| `JWT_SECRET` | ≥16 random chars |
| `JWT_REFRESH_SECRET` | ≥16 random chars |
| `NODE_ENV` | `production` |
| `RUN_QUEUE_WORKER` | `false` |
| `SOCKET_CORS_ORIGINS` | `*` or your exact site URL |

Important: **`DATABASE_URL`** and **`DIRECT_URL`** must be available at **build time** too (Prisma runs `migrate deploy` during `vercel-build`). In Vercel → Project → Settings → Environment Variables, edit each var and tick **Production** for **Build** as well as **Runtime**.

Optional: **`VITE_API_BASE_URL`** — only if you split frontend and API later; same‑host deploy leaves it unset.

## 4. Deploy

Push to `main` or click **Deploy**. First build runs:

`backend`: `prisma migrate deploy` → `prisma generate` → `tsc`  
root: `vite build`

## 5. Smoke tests

- Open `https://YOUR_PROJECT.vercel.app/healthz` → `{"status":"ok"}`
- Open the site root → login page → sign in (hits `/api/v1/...` on the same domain).

## 6. Seed (optional)

Run once against prod DB (local shell with prod `DATABASE_URL`):

```bash
cd backend && npx prisma db seed
```

## Alternative: API on Render + UI on Vercel

If you outgrow serverless (heavy WebSockets, background workers), split the API back out (e.g. `render.yaml` + Docker in `backend/`) and set **`VITE_API_BASE_URL`** to the API origin.
