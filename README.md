<<<<<<< HEAD
# Dubai AI Business Agent

**AI-powered WhatsApp assistant for UAE SMEs. Production-ready SaaS with real Stripe billing, live WhatsApp integration, and Arabic support.**

**🚀 Status:** Code complete. Mock mode active. Ready for Week 1 implementation (make it real).

---

## 🎯 EXECUTIVE SUMMARY

This is a **production-ready monorepo** for an AI WhatsApp business assistant targeting Dubai SMEs. Current state: all code built, TypeScript clean, tests ready. **Next milestone: disable mock mode and run one real WhatsApp conversation end-to-end by Day 2.**

### What's Actually Working
- ✅ Full Next.js + Express stack, compiled clean, zero errors
- ✅ WhatsApp webhook routes configured
- ✅ AI/RAG engine integration (OpenAI GPT-4o + embeddings)
- ✅ Stripe billing logic with dunning/retry
- ✅ Arabic + English bilingual support (RTL-aware)
- ✅ Worker health monitoring, job retry, cleanup automation
- ✅ Database with 20+ performance indexes
- ✅ Rate limiting, security headers, JWT auth

### What's Still Mock
- ⏳ OpenAI responses (returns canned replies unless `OPENAI_MOCK_RESPONSES=false`)
- ⏳ Stripe checkout (accepts all cards, never hits live Stripe unless `STRIPE_MOCK_CHECKOUT=false`)
- ⏳ WhatsApp (hooks configured, but no real Meta BSP account yet)

---

## 📋 STACK

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind, next-intl (EN/AR)
- **Backend:** Node.js, Express, TypeScript, Zod, JWT, bcrypt
- **Database:** PostgreSQL + pgvector (for AI embeddings)
- **Queue/Cache:** Redis + BullMQ
- **AI:** OpenAI (GPT-4o, text-embedding-3-small)
- **Billing:** Stripe
- **Messaging:** WhatsApp Business API (via Meta Cloud API)
- **Email:** Nodemailer (SMTP-configurable)

---

## 🏗️ Project Structure

```
apps/
  api/              # Express server, webhooks, AI engine, billing, workers
  web/              # Next.js dashboard + marketing site
packages/
  db/               # Prisma schema, migrations, seed
deploy/
  docker/           # Dockerfiles for api/web
  nginx/            # Reverse proxy config
docs/
  *.md              # Architecture, schema, endpoints, strategy
storage/
  uploads/          # User-uploaded PDFs for knowledge base
```

---

## 🚀 QUICKSTART (Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Docker (optional, for pgvector)

### 1. Setup Database

```bash
# Install pgvector extension
psql -U postgres
CREATE DATABASE dubai_ai_business_agent;
\c dubai_ai_business_agent
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Install and Migrate

```bash
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
```

Demo credentials:
- Email: `admin@demo.ae`
- Password: `DemoPass123!`

### 3. Configure Environment

```bash
cp .env.example .env
# Update .env with your secrets (see "Enable Real Mode" below)
```

### 4. Run Development

```bash
npm run dev              # API + Web on localhost:4000 and localhost:3000
npm run dev:all         # + BullMQ workers
```

URLs:
- Dashboard: `http://localhost:3000/en/dashboard`
- API: `http://localhost:4000`
- Health: `http://localhost:4000/health`

---

## ⚡ ENABLE REAL MODE (Week 1 Priority)

### Step 1: Get OpenAI Keys

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create API key, copy it
3. Update `.env`:

```
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_MOCK_RESPONSES=false
```

Test:

```bash
npm run dev:api
# Open dashboard, create lead -> AI should reply with real OpenAI response
```

### Step 2: Get Stripe Live Keys

1. Sign up at [stripe.com](https://stripe.com), verify UAE business
2. Copy **live** secret key (starts `sk_live_`)
3. Go to Webhooks, create endpoint `https://yourdomain.com/api/billing/webhook`
4. Copy signing secret (starts `whsec_`)
5. Update `.env`:

```
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_MOCK_CHECKOUT=false
```

Test:

```bash
# On dashboard, go to Billing -> Upgrade Plan
# Use test card 4242 4242 4242 4242, any future exp
# Should create real Stripe subscription
```

### Step 3: Setup WhatsApp Business Account

1. Apply for **Meta Cloud API** access (go to `developers.facebook.com`)
2. Create a WhatsApp Business Account
3. Request approval for Business Messaging (1-2 weeks)
4. Get **Business Phone Number ID** and **Verify Token**
5. Update `.env`:

```
META_APP_SECRET=xxxxx              # From app settings
META_VERIFY_TOKEN=your-random-token # Your choice
```

6. Configure webhook URL in Meta dashboard: `https://yourdomain.com/api/whatsapp/webhook`
7. Subscribe to `messages` and `message_template_status_update` events

### Step 4: Test End-to-End

```bash
# From local machine, text your business WhatsApp number:
# "Hello, what's your business about?"

# Should see:
# 1. Webhook received in /api/whatsapp/webhook
# 2. Message logged to console
# 3. AI generates reply (real OpenAI)
# 4. Reply sent back via WhatsApp
```

---

## 📅 WEEK 1: Make It Real

**Goal:** Have ONE real WhatsApp conversation working end-to-end (you testing with your own number).

| Day | Task | Verification |
|-----|------|-------------|
| **1-2** | Enable OpenAI + Stripe real keys | Test AI response on dashboard |
| **2** | Register Meta BSP account + start approval | API keys generated |
| **3-4** | Deploy to staging server (AWS/DigitalOcean) | API accessible via HTTPS |
| **4** | Point Stripe + Meta webhooks to staging | Receive webhook logs |
| **5** | Test full flow: WhatsApp → API → AI → WhatsApp | Get real AI reply in WhatsApp |
| **6-7** | Record loom demo, clean up logs, prepare landing | Demo + landing link ready |

---

## 📅 WEEK 2-4: Go-to-Market

### Week 2: Setup & Outreach Infrastructure

**Day 1-2:**
- Pick ONE vertical (recommend: **salons, restaurants, or consultancies**)
- Build target list: 100 Dubai businesses (prioritize Pakistani/Indian/Filipino-owned)
- Research their Instagram + WhatsApp

**Day 3-4:**
- Create landing page (Carrd or Framer): `www.dubaiaibusiness.com`
- Upload Loom demo video
- Add "Book Free Trial" CTA → collect email/WhatsApp

**Day 5-7:**
- Daily outreach: 15-20 DMs per day via Instagram
- Message: *"Hey [name], saw your [business]. We built an AI WhatsApp assistant for [vertical]. Free 1-week trial, no credit card. Want to try?"*
- Track in Google Sheet: contact, response, trial start date, conversion

**Target:** 5-10 trial signups by end of Week 2

### Week 3-4: Deliver & Convert

**For each trial:**
1. Setup business WhatsApp number (Meta API)
2. Configure AI knowledge base (upload past conversations/FAQs)
3. Test with owner
4. After 7 days: convert to paid

**Conversion offer:**
- Setup fee: **800-1,200 AED** (one-time)
- Monthly subscription: **200-400 AED** (based on message volume)
- Guarantee: 30-day money-back if AI doesn't help

**Goal:** 3-5 paid customers by end of Week 4 = **2,400-6,000 AED revenue**

---

## 💰 MONETIZATION ROADMAP

### Month 1 (Now): Setup Fee + Small Monthly
- Free 7-day trial (no credit card)
- Convert to: **800 AED setup + 200 AED/mo** per customer
- Target: 5 customers = **5,000 AED**

### Month 2+: Scale to Full SaaS
- Expand to 2-3 more verticals
- Introduce tiered plans (Starter, Professional, Enterprise)
- Automate onboarding (reduce manual setup)
- Target: 15-20 customers = **15,000+ AED/mo**

### Month 3+: Partnerships
- Approach local digital agencies for white-label
- Reseller agreements (they sell, you deliver)
- Can unlock 50,000+ AED through one partnership

---

## 🔐 SECURITY & PRODUCTION

### Before Going Live

```bash
# 1. Set production ENV vars
NODE_ENV=production
JWT_ACCESS_SECRET=<generate-64-char-random>
JWT_REFRESH_SECRET=<generate-64-char-random>

# 2. Enable SSL/HTTPS (required for Meta webhooks)
# Use Let's Encrypt (free) or buy certificate

# 3. Configure rate limits for prod
RATE_LIMIT_MAX=1000
ORG_RATE_LIMIT_MAX=5000

# 4. Setup monitoring/alerts
# - Check /api/health endpoint every 5 min
# - Log errors to external service (Sentry, LogRocket)
# - Setup Stripe/WhatsApp failure alerts
```

### Deployment (AWS/DigitalOcean)

```bash
# Build & deploy
npm run build

# Start with PM2
pm2 start ecosystem.config.cjs
pm2 save

# Proxy with Nginx
# See deploy/nginx/dubai-ai-business-agent.conf
```

Full deployment guide: see `docs/deployment.md`

---

## 🧪 TESTING

```bash
# All tests (requires live DB)
npm test

# Individual test files
npm run test src/app.test.ts
npm run test src/whatsapp-webhook.test.ts

# Simulate WhatsApp webhook locally
npm run simulate:whatsapp
```

Tests verify:
- ✅ Authentication & tenant isolation
- ✅ WhatsApp message parsing
- ✅ AI RAG response generation
- ✅ Lead scoring
- ✅ Appointment booking

---

## 📚 DOCUMENTATION

| Document | Purpose |
|----------|---------|
| [Architecture](docs/architecture.md) | System design, data flow |
| [API Endpoints](docs/api-endpoints.md) | REST API reference |
| [Database Schema](docs/database-schema.md) | Data models |
| [Deployment](docs/deployment.md) | AWS/Docker/Nginx setup |
| [Revenue Model](docs/revenue-model.md) | Unit economics |
| [Marketing Strategy](docs/marketing-strategy.md) | GTM plan |

---

## 🛠️ TROUBLESHOOTING

### "Can't reach database server"
```bash
# Ensure PostgreSQL is running
psql -U postgres -d dubai_ai_business_agent
# If not running: `postgres -D /usr/local/var/postgres` (macOS) or `pg_ctl start` (Linux)
```

### WhatsApp webhook not receiving
- Verify `META_VERIFY_TOKEN` matches Meta dashboard
- Check firewall/NAT allows inbound to port 4000
- Confirm webhook URL is HTTPS (required by Meta)
- Check `/api/whatsapp/webhook` logs for 404s

### AI responses are canned/mock
- Ensure `OPENAI_MOCK_RESPONSES=false` in `.env`
- Check `OPENAI_API_KEY` is valid (test at platform.openai.com)
- Verify API key has funds

### Stripe not charging
- Confirm `STRIPE_MOCK_CHECKOUT=false` in `.env`
- Check secret key starts with `sk_live_` (not `sk_test_`)
- Webhook URL is configured and receiving `invoice.payment_succeeded` events

---

## 📞 SUPPORT

- **Docs:** `docs/` folder
- **API Health:** `GET http://localhost:4000/health`
- **Logs:** `tail -f logs/api.log`
- **WhatsApp Simulation:** `npm run simulate:whatsapp`

---

## 📝 LICENSE & OWNERSHIP

Private project. All rights reserved. Built 2024-2026 for Dubai AI Business Agent.
=======
# Real-Estate-Ai-Assitant
this project is to automate all Dubai companies
>>>>>>> d3334f0127b5d3695b299684a4c50576b328f0a4
