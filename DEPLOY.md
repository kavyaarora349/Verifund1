# Deploy VeriFund (two sites)

**Site 1 — API** (long‑running Node + Prisma + Redis), e.g. **Render**.  
**Site 2 — UI** (static Vite build), e.g. **Vercel**.

The browser talks to the API using **`VITE_API_BASE_URL`** (set at **build** time on Vercel).

---

## A. API (Render)

1. Create a **Web Service** → **Docker**.
2. **Dockerfile path**: `backend/Dockerfile`  
   **Docker context**: `backend`
3. **Health check path**: `/healthz`
4. **Environment variables**:

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Supabase pooler URL |
| `DIRECT_URL` | Supabase direct URL (Prisma) |
| `REDIS_URL` | Upstash `rediss://…` |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Each ≥16 chars |
| `NODE_ENV` | `production` |
| `RUN_QUEUE_WORKER` | `true` if Redis is solid; else `false` for inline fraud |
| `SOCKET_CORS_ORIGINS` | Your Vercel origin, e.g. `https://your-app.vercel.app` (or `*` while testing) |

5. Deploy and copy the service URL, e.g. `https://verifund-api.onrender.com`.

Your API base path for the frontend is:

`https://YOUR_API_HOST/api/v1`

---

## B. UI (Vercel)

1. Import this repo — **Root Directory**: `./` (repo root).
2. Settings should match **`vercel.json`**: install `npm ci`, build `npm run build`, output **`dist`**.
3. **Environment variables** (Production — enable for **Build**):

| Variable | Example |
|----------|---------|
| `VITE_API_BASE_URL` | `https://YOUR_API_HOST.onrender.com/api/v1` |

Use the **exact** URL from step A + **`/api/v1`**.

4. Deploy / redeploy so the env var is baked into the bundle.

`.vercelignore` skips `api/` and `backend/` — only the frontend is uploaded (API runs on Render).

---

## Smoke tests

- `GET https://YOUR_API_HOST/healthz` → `{"status":"ok"}`
- Open the Vercel URL → login should call your Render API (check browser Network tab).

---

## Optional: Render Blueprint

See **`render.yaml`** for a template Web Service (set secrets in the dashboard).

---

## Seed (optional)

With prod `DATABASE_URL` / `DATABASE_URL` from Render env:

```bash
cd backend && npx prisma db seed
```

---

## Legacy: single‑site Vercel (Express + UI)

The repo may still contain **`api/index.ts`** for an experimental all‑in‑one Vercel deploy; **two‑site setup ignores it** via `.vercelignore`.
