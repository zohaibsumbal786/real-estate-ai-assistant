# Windows Setup (No Docker)

Docker Desktop is **optional**. For Windows, use this stack instead:

| Component | Tool | Why |
|-----------|------|-----|
| PostgreSQL + pgvector | **Prisma Dev** (`npx prisma dev`) | Built-in PGlite database, no Docker, no install |
| Redis (optional) | **Upstash free tier** OR skip | Set `REDIS_OPTIONAL=true` to run without Redis |
| App | Node.js 20+ | Already installed |

## Quick Start (Recommended)

Double-click or run:

```bat
run-no-docker.bat
```

This will:
1. Start **Prisma Dev** local PostgreSQL (port 51214)
2. Apply migrations and seed demo data
3. Start the web app + API (Redis optional)

## Manual Start

```powershell
# Terminal 1 — keep this running (local database)
npx prisma dev -d -n dubai-ai --schema packages/db/prisma/schema.prisma

# Terminal 2 — app
npm run db:deploy
npm run db:seed
npm run dev
```

Ensure `.env` contains:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:51214/template1?sslmode=disable&schema=public"
REDIS_OPTIONAL="true"
```

> **Important:** `sslmode=disable` is required for Prisma Dev on Windows.

## Open the App

| Page | URL |
|------|-----|
| Landing | http://localhost:3000/en |
| Login | http://localhost:3000/en/login |
| Dashboard | http://localhost:3000/en/dashboard |
| Arabic | http://localhost:3000/ar |

**Demo login:** `admin@demo.ae` / `DemoPass123!`

## Production Alternative (Cloud, No Local DB)

For staging/production without any local database:

1. **[Neon](https://neon.tech)** — free PostgreSQL with pgvector
2. **[Upstash](https://upstash.com)** — free Redis
3. Paste connection strings into `.env`
4. Set `REDIS_OPTIONAL=false` when Redis is configured

## When to Use Docker

Use Docker only if you prefer containerized Postgres/Redis on a server. For local Windows development, **Prisma Dev is faster and more reliable** than Docker Desktop.
