# Deploy VeriFund (two sites)

**Site 1 — API** (long‑running Node + Prisma + Redis), e.g. **Render**.  
**Site 2 — UI** (static Vite build), e.g. **Vercel**.

The browser talks to the API using **`VITE_API_BASE_URL`** (set at **build** time on Vercel).

---

## A. API on Render (explained step by step)

Render runs your **backend** as a **long‑lived Docker container**. It is **not** the React app — only the Node API in `backend/` (Express + Prisma + Redis).

### What the Dockerfile does

`backend/Dockerfile`:

1. Installs dependencies with **`npm ci`**.
2. Runs **`prisma generate`** and **`npm run build`** (TypeScript → `dist/`).
3. When the container **starts**, it runs **`prisma migrate deploy`** (applies DB migrations), then **`node dist/server.js`** (your HTTP server + Socket.IO + optional BullMQ worker).

So: **build** happens at image build time; **migrations** run on each deploy/start before the server listens.

Render sets **`PORT`** in the environment (often not `4000`). The app reads **`process.env.PORT`**, so you do **not** hardcode the port.

### 1. Prerequisites (before Render)

| Thing | Why |
|--------|-----|
| **GitHub repo** pushed | Render pulls code from Git. |
| **Supabase (Postgres)** | `DATABASE_URL` (pooler) + **`DIRECT_URL`** (direct). Prisma needs **both** — migrations often need the **direct** connection. |
| **Redis** (e.g. **Upstash**) | Copy the **`rediss://…`** URL → **`REDIS_URL`**. |
| **Secrets** | Long random strings for **`JWT_SECRET`** and **`JWT_REFRESH_SECRET`** (each ≥ 16 characters). |

### 2. Create the Web Service

1. Log in at [render.com](https://render.com) → **Dashboard**.
2. **New +** → **Web Service**.
3. **Connect** your GitHub account if asked, then **select this repository** and branch (e.g. `main`).

### 3. Configure the service

Use these fields (names match what you see in the UI):

| Setting | Value |
|---------|--------|
| **Name** | Anything, e.g. `verifund-api`. |
| **Region** | Pick one close to you or your DB (latency). |
| **Branch** | `main` (or your deploy branch). |
| **Root Directory** | Leave **empty** (repository root). The Dockerfile paths below are relative to that root. |
| **Runtime** | **Docker**. |
| **Dockerfile Path** | `backend/Dockerfile` |
| **Docker Build Context** | `backend` |

Do **not** use “Node” runtime unless you change the project — this repo is set up for **Docker**.

### 4. Instance size

Free tier is OK to try; it **spins down after idle** (first request after sleep can take ~30–60s). Paid tiers stay warm.

### 5. Environment variables (Render → your service → **Environment**)

Add **every** row below (keys must match exactly — the Node app reads these names):

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Supabase **connection pooling** URL (often contains `pooler` / `6543` or similar). |
| `DIRECT_URL` | Supabase **direct** Postgres URL (session/direct — used heavily by Prisma migrate). |
| `REDIS_URL` | **Only** the URL from Upstash (starts with `rediss://` or `redis://`). Do **not** paste the whole `redis-cli --tls -u …` line. |
| `JWT_SECRET` | Random string, ≥16 chars |
| `JWT_REFRESH_SECRET` | Different random string, ≥16 chars |
| `NODE_ENV` | `production` |
| `RUN_QUEUE_WORKER` | `true` if Redis works and you want the BullMQ fraud worker in-process; **`false`** if you want fraud checks **inline only** (simpler if Redis misbehaves). |
| `SOCKET_CORS_ORIGINS` | Your frontend origin: `https://your-app.vercel.app` or `*` while debugging CORS |

Optional (defaults exist in code — add only if you care):

- `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- `API_PREFIX` (default `/api/v1`)
- Algorand keys if you use on-chain features

**Important:** If **`prisma migrate deploy`** fails in logs, almost always **`DATABASE_URL` / `DIRECT_URL`** are wrong or the direct URL is still pointing at the pooler.

### 6. Health check

In **Settings → Health Check Path**, set:

`/healthz`

Render will `GET https://YOUR_SERVICE.onrender.com/healthz` and expect success. That route is defined on the Express app **outside** `/api/v1`.

### 7. Deploy

Click **Create Web Service** (or **Save** / **Manual Deploy**). Watch **Logs**:

- You should see Prisma migrate, then something like the server listening.
- When status is **Live**, open:

`https://<your-service-name>.onrender.com/healthz`

You want JSON like: `{"status":"ok"}`.

### 8. URL you give to the frontend (Vercel)

REST routes live under **`API_PREFIX`**, default **`/api/v1`**. So the base URL for **`VITE_API_BASE_URL`** is:

```text
https://<your-service-name>.onrender.com/api/v1
```

No trailing slash after `v1` (the client code builds paths like `/auth/login` on top of this base).

### 9. Common problems

| Symptom | What to check |
|---------|----------------|
| Build fails on Docker | Logs in Render build step; usually Dockerfile path/context wrong. |
| Crash on start after “migrate” | `DIRECT_URL`, DB firewall (Supabase allow all / Render IPs), or invalid URL. |
| 502 / never becomes healthy | Process exits — read runtime logs; often missing `REDIS_URL` or invalid JWT length. |
| Browser “Network error” from Vercel UI | Wrong **`VITE_API_BASE_URL`**, or CORS — set **`SOCKET_CORS_ORIGINS`** / ensure API URL is **https** and matches what you configured. |
| Very slow first request | Free tier cold start — normal. |

#### Prisma **P3005** — “The database schema is not empty”

This happens when Postgres **already has tables** (for example you used **`prisma db push`** earlier), but the **`_prisma_migrations`** table doesn’t list your migration folders yet. **`migrate deploy`** then refuses to run.

**Fix (one time):** mark existing migrations as already applied (**baseline**), from your PC with the **same** `DATABASE_URL` as production:

```bash
cd backend
# Use the same DATABASE_URL (and DIRECT_URL in .env if prisma schema needs it) as Render
npx prisma migrate resolve --applied "20260501101405_allocation_request_approvals"
npx prisma migrate resolve --applied "20260501140000_init"
npx prisma migrate resolve --applied "20260501164000_allocation_request_algo_fields"
```

Then redeploy on Render. Future deploys will run **`migrate deploy`** and see all migrations as applied (no-op unless you add new ones).

Only do this if the **live schema already matches** these migrations. If the DB is disposable, you can instead empty the database in Supabase and let **`migrate deploy`** run from scratch.

### 10. After the API works

Point **Vercel** `VITE_API_BASE_URL` at the URL in section 8, redeploy the frontend, then test login from the Vercel URL.

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
