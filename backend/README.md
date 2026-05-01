# VeriFund backend

API for fund-flow tracking (local / self-hosted): PostgreSQL + Redis (rate limits + BullMQ fraud queue), JWT auth with persisted refresh tokens, approval workflow with ledger anchoring, Socket.IO alerts, and rule-based fraud detection.

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+

## Local setup

1. Copy `.env.example` to `.env` and set strong `JWT_SECRET` / `JWT_REFRESH_SECRET` (≥16 characters).
2. `npm install`
3. `npm run prisma:generate`
4. `npm run prisma:migrate` — applies SQL in `prisma/migrations/`
5. `npm run prisma:seed` — creates ministries/departments, test users, transactions, flags, fraud rules
6. `npm run dev` — HTTP + Socket.IO + BullMQ fraud worker (same process)

### Test logins (after seed)

| Email | Password | Role |
|-------|----------|------|
| admin@publedger.gov.in | Admin@123 | ADMIN |
| auditor@publedger.gov.in | Audit@123 | AUDITOR |
| finance@publedger.gov.in | Finance@123 | FINANCE_OFFICER |
| depthead@publedger.gov.in | Dept@123 | DEPT_HEAD |
| public@publedger.gov.in | Public@123 | PUBLIC |

Change seeded passwords if you expose this beyond local dev.

## Docker

From `backend/`:

```bash
docker compose up --build
```

Compose starts Postgres, Redis, and the API (`migrate deploy` runs on container start). Run seed once against the DB:

```bash
docker compose exec api npx tsx prisma/seed.ts
```

(Or run `npm run prisma:seed` from the host with `DATABASE_URL` pointing at the exposed Postgres port.)

## Behaviour notes

- **Amounts:** `POST /transactions` accepts **whole rupees** (integer). The database stores **paise** (`× 100`).
- **Fraud checks:** With `RUN_QUEUE_WORKER=true` (default), jobs run on Redis via BullMQ; the API process also starts the worker. Set `RUN_QUEUE_WORKER=false` only for constrained dev setups — fraud runs inline (Redis is still required for rate limiting).
- **Ledger:** Above `LEDGER_ALGORAND_THRESHOLD_PAISE` (default ₹1 Cr), the service uses **Algorand** when `ALGORAND_ADMIN_MNEMONIC` + `ALGORAND_NODE_URL` are set; otherwise it writes a deterministic `LOCAL-ALGO-…` anchor. Sub-threshold flows use a **Fabric placeholder** (`LOCAL-FABRIC-…`) until Fabric SDK credentials are wired.
- **Socket.IO:** Clients authenticate with `socket.auth = { token: "<access JWT>" }`. Events: `flag:new`, `tx:confirmed`, `tx:flagged`, `approval:needed`.

## API surface

Mounted under `API_PREFIX` (default `/api/v1`): auth, transactions, approvals, budgets, flags, reports, users, admin, public routes as specified in the product brief.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server + worker |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled server (run migrations separately in prod) |
| `npm run start:prod` | `prisma migrate deploy` then `node dist/server.js` |
| `npm run prisma:migrate` | Create/apply migrations (dev) |
| `npm run prisma:seed` | Seed database |
