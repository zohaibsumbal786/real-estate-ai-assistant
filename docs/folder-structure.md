# Folder Structure

```
dubai-ai-business-agent/
├── apps/
│   ├── api/                          # Express.js backend
│   │   └── src/
│   │       ├── routes/               # REST route handlers
│   │       ├── services/             # Business logic (AI, RAG, billing, WhatsApp)
│   │       ├── workers/              # BullMQ background workers
│   │       ├── queues/               # Redis queue definitions
│   │       ├── middleware/           # Auth, rate limiting, errors
│   │       └── lib/                  # JWT, HTTP helpers
│   └── web/                          # Next.js 15 frontend
│       ├── app/[locale]/             # Localized App Router pages
│       │   ├── (marketing)/          # Public: landing, pricing, features, contact
│       │   ├── (app)/                # Authenticated dashboard pages
│       │   ├── login/
│       │   └── register/
│       ├── components/               # UI shell, panels, theme
│       ├── messages/                 # i18n (en.json, ar.json)
│       └── lib/                      # API client, utilities
├── packages/
│   └── db/                           # Prisma schema, migrations, seed
├── deploy/
│   ├── docker/                       # Dockerfile.api, Dockerfile.web
│   └── nginx/                        # Reverse proxy config
├── docs/                             # Architecture, API, deployment, business docs
├── storage/uploads/                  # Knowledge document storage (per tenant)
├── docker-compose.yml
├── ecosystem.config.cjs              # PM2 process manager
└── .github/workflows/ci.yml          # CI/CD pipeline
```

## Key Files

| File | Purpose |
|------|---------|
| `packages/db/prisma/schema.prisma` | Complete database schema |
| `apps/api/src/app.ts` | API route registration |
| `apps/api/src/services/ai-engine.ts` | GPT intent + reply generation |
| `apps/api/src/services/whatsapp-webhook-service.ts` | Meta webhook processing |
| `apps/web/components/app-shell.tsx` | Dashboard navigation shell |
| `packages/db/src/seed.ts` | Demo data + subscription plans |
