# Architecture

## Overview

Dubai AI Business Agent is a multi-tenant SaaS platform that connects WhatsApp Business API, OpenAI GPT, and a PostgreSQL/pgvector data layer to automate customer conversations for UAE SMEs.

```
┌─────────────┐     HTTPS      ┌──────────────┐     REST/JWT    ┌─────────────┐
│  Next.js 15 │ ◄────────────► │ Express API  │ ◄──────────────►│ PostgreSQL  │
│  Web (EN/AR)│                │  TypeScript  │                 │  + pgvector │
└─────────────┘                └──────┬───────┘                 └─────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              ┌──────────┐     ┌────────────┐    ┌─────────────┐
              │  Redis   │     │  BullMQ    │    │ Meta Cloud  │
              │  cache   │     │  workers   │    │ WhatsApp API│
              └──────────┘     └────────────┘    └─────────────┘
                                      │
                              ┌───────┴────────┐
                              ▼                ▼
                      Knowledge worker   Reminder worker
                      (RAG embeddings)   (appointments)
```

## Core Services

| Service | Responsibility |
|---------|----------------|
| **Web** (`apps/web`) | Marketing site, auth, dashboard, EN/AR RTL |
| **API** (`apps/api`) | REST API, WhatsApp webhooks, AI engine, billing |
| **DB** (`packages/db`) | Prisma schema, migrations, seed |
| **Knowledge worker** | PDF/DOCX extraction, chunking, embeddings |
| **Reminder worker** | 24h/1h appointment WhatsApp reminders |

## Multi-Tenancy

- Every authenticated request carries a JWT with `organizationId`
- Tenant context is **never** accepted from client payloads
- All queries filter by `organizationId`
- Plan limits enforced per tenant (messages, seats, knowledge docs)

## AI Pipeline

1. Inbound WhatsApp message arrives via signed Meta webhook
2. Customer and conversation records are upserted
3. Language detected (Arabic/English)
4. Intent classified (support, lead, booking, sales, escalation)
5. RAG retrieval from tenant knowledge chunks (pgvector cosine distance)
6. GPT generates contextual reply
7. Lead capture / appointment booking side-effects run when intents match
8. Outbound message sent via Meta Cloud API (mocked locally)

## Security

- JWT access tokens (15m) + refresh token rotation (7d)
- bcrypt password hashing (cost 12)
- Helmet, CORS, IP + org rate limiting
- Stripe webhook signature verification
- Meta webhook HMAC verification

## Deployment Topologies

**Development:** `npm run dev` with local PostgreSQL, Redis, mock OpenAI/Stripe

**Docker:** `docker compose up` — postgres, redis, api, web, workers

**Production (AWS):** EC2/ECS + RDS PostgreSQL + ElastiCache Redis + ALB + Nginx + PM2

See [deployment.md](./deployment.md) for full production setup.
