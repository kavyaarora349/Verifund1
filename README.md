# VeriFund

React UI + Node API for local demo use.

## Run locally

**Terminal 1 — API** (from repo root):

```bash
cd backend
copy .env.example .env
# Edit .env: DATABASE_URL, DIRECT_URL, JWT_*, etc.
# If you do not run Redis locally, keep SKIP_REDIS=true (already in .env.example).
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

API listens on **http://localhost:4000** (REST under `/api/v1`).

**Terminal 2 — UI**:

```bash
npm install
npm run dev
```

Open **http://localhost:3000**. The UI calls **http://localhost:4000/api/v1** by default.

Optional: create `.env` in the repo root with `GEMINI_API_KEY` if you use Gemini features from `vite.config`.

To point the UI at another API base only, set **`VITE_API_BASE_URL`** (e.g. in `.env.local`) to that origin + `/api/v1`.
