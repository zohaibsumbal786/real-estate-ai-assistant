# Deployment Guide

## Option 1: Local Development (Windows/macOS/Linux)

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ with pgvector
- Redis 7+

### Setup

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev:all
```

**URLs:**
- Landing: http://localhost:3000/en
- Dashboard: http://localhost:3000/en/dashboard
- API: http://localhost:4000/health

---

## Option 2: Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

Run migrations inside the API container:

```bash
docker compose exec api npm run db:deploy
docker compose exec api npm run db:seed
```

---

## Option 3: Production (AWS + PM2 + Nginx)

### 1. Provision Infrastructure

| Resource | Recommendation |
|----------|----------------|
| EC2 | t3.medium (2 vCPU, 4 GB) minimum |
| RDS PostgreSQL | db.t3.micro with pgvector |
| ElastiCache | Redis 7 cluster |
| S3 | Knowledge document backups (optional) |
| Route 53 | DNS for your domain |
| ACM | TLS certificate |

### 2. Server Setup

```bash
# Install Node 20, PM2, Nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx
sudo npm install -g pm2

# Clone and build
git clone <repo> /opt/dubai-ai-business-agent
cd /opt/dubai-ai-business-agent
cp .env.example .env   # configure production secrets
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 3. Nginx

Copy `deploy/nginx/dubai-ai-business-agent.conf` to `/etc/nginx/sites-available/`, update domain names, enable, reload:

```bash
sudo ln -s /etc/nginx/sites-available/dubai-ai-business-agent /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4. External Integrations

| Service | Configuration |
|---------|---------------|
| **Meta WhatsApp** | Set `META_APP_SECRET`, `META_VERIFY_TOKEN`, configure webhook URL to `https://api.yourdomain.com/api/whatsapp/webhook` |
| **OpenAI** | Set `OPENAI_API_KEY`, disable `OPENAI_MOCK_RESPONSES` |
| **Stripe** | Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, create price IDs matching plan slugs, disable `STRIPE_MOCK_CHECKOUT` |
| **SMTP** | Configure `SMTP_*` variables for email alerts |

### 5. CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push:
- Typecheck
- Migrations + seed
- API tests
- Production build

Deploy by SSH pull + rebuild on the server, or extend CI with a deploy job.

### 6. Monitoring

- PM2: `pm2 monit`, `pm2 logs`
- Health check: `GET /health`
- Set up CloudWatch or Datadog for production metrics
- Enable RDS automated backups (7-day minimum)

### 7. Scaling

| Load | Action |
|------|--------|
| 100 tenants | Single EC2 + RDS micro sufficient |
| 1,000 tenants | Separate worker instances, RDS medium, Redis cluster |
| 10,000+ tenants | ECS/EKS, read replicas, horizontal API scaling |
