# Database Schema

Full Prisma schema: `packages/db/prisma/schema.prisma`

## Entity Relationship Diagram

```
Organization ──┬── User
               ├── Customer ──┬── Conversation ── Message
               │              └── Lead
               ├── Appointment
               ├── KnowledgeDocument ── KnowledgeChunk (vector embedding)
               ├── Subscription ── Plan
               ├── Notification
               ├── BusinessHour
               └── RefreshToken
```

## Core Models

### Organization (Tenant)
Multi-tenant root. Stores WhatsApp Business API credentials, timezone, country.

### User
Team members with roles: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `SUPPORT_AGENT`.

### Customer
WhatsApp contacts per tenant. Unique on `(organizationId, phone)`.

### Conversation
Chat sessions with AI intent tracking, human escalation flag, language.

### Message
Inbound/outbound messages with provider IDs for deduplication.

### Lead
CRM pipeline with scoring (0–100), status workflow, assignee.

### Appointment
Bookings with reminder timestamps (`reminder24hSentAt`, `reminder1hSentAt`).

### KnowledgeDocument + KnowledgeChunk
RAG pipeline. Chunks store `vector(1536)` embeddings via pgvector.

### Plan + Subscription
SaaS billing. Plans: `free-trial`, `starter`, `professional`, `enterprise`.

### Notification
In-app alerts for leads, appointments, billing, conversations.

### BusinessHour
Per-day availability windows for AI appointment slot proposals.

## Enums

| Enum | Values |
|------|--------|
| `UserRole` | SUPER_ADMIN, ADMIN, MANAGER, SUPPORT_AGENT |
| `LeadStatus` | NEW, QUALIFIED, CONTACTED, PROPOSAL_SENT, WON, LOST |
| `ConversationStatus` | OPEN, PENDING, RESOLVED, ARCHIVED |
| `AppointmentStatus` | SCHEDULED, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW |
| `SubscriptionStatus` | TRIALING, ACTIVE, PAST_DUE, CANCELLED, EXPIRED |
| `KnowledgeDocumentStatus` | PENDING, PROCESSING, READY, FAILED |

## Migrations

```bash
npm run db:migrate    # dev: create migration
npm run db:deploy     # prod: apply migrations
npm run db:seed       # seed plans + demo org
```

Migration history:
- `20260619141500_init` — core schema
- `20260619154500_comms_ai_engine_fields` — AI conversation fields
- `20260619163000_rag_leads_booking` — RAG, leads, appointments
- `20260619172000_frontend_dashboard_support` — dashboard indexes
- `20260620143000_subscriptions_queues_deployment` — billing, reminders
