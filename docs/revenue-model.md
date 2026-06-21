# Revenue Model

## Subscription Tiers (AED/month)

| Plan | Monthly | Yearly (17% off) | Messages | Seats | Knowledge Docs |
|------|---------|------------------|----------|-------|----------------|
| **Free Trial** | 0 | — | 500 | 1 | 5 |
| **Starter** | 299 | 2,990 | 3,000 | 3 | 50 |
| **Professional** | 699 | 6,990 | 15,000 | 10 | 250 |
| **Enterprise** | 1,499 | 14,990 | 50,000 | 30 | 1,000 |

## Unit Economics (Professional plan example)

| Metric | Value |
|--------|-------|
| ARPU | AED 699/mo (~USD 190) |
| Est. COGS/tenant | ~AED 120/mo (OpenAI + WhatsApp + infra) |
| Gross margin | ~83% |
| CAC target | < AED 1,400 (2-month payback) |
| LTV (18 mo avg) | AED 12,582 |
| LTV:CAC | > 8:1 |

## Revenue Streams

1. **Core SaaS subscriptions** — primary recurring revenue
2. **Annual prepay discount** — improves cash flow, reduces churn
3. **Overage add-ons** (future) — extra message packs at AED 99/1,000 messages
4. **WhatsApp onboarding fee** (future) — one-time AED 499 Meta Business setup
5. **Enterprise custom** — white-label, dedicated infra, SLA contracts

## Growth Projections

| Year | Tenants | MRR (AED) | ARR (AED) |
|------|---------|-----------|-----------|
| Y1 | 200 | 140,000 | 1,680,000 |
| Y2 | 800 | 560,000 | 6,720,000 |
| Y3 | 2,500 | 1,750,000 | 21,000,000 |

*Assumes 60% Starter, 30% Professional, 10% Enterprise mix after trial conversion.*

## Key Metrics to Track

- Trial → paid conversion rate (target: 25%)
- Monthly churn (target: < 4%)
- Net revenue retention (target: > 110%)
- Messages per tenant (usage health indicator)
- Lead conversion rate for customers (value proof)

## Billing Implementation

- Stripe Checkout for subscription creation
- Webhook handlers for payment success/failure
- Plan limits enforced in API middleware
- Mock checkout enabled for local development
