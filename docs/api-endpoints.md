# API Endpoint Reference

Base URL: `http://localhost:4000`

Authenticated routes require `Authorization: Bearer <accessToken>`. Tenant context is always derived from the JWT and never accepted from client payloads.

## Auth

- `POST /api/auth/register` — create an organization and admin user (starts on Free Trial plan).
- `POST /api/auth/login` — issue access and refresh tokens.
- `POST /api/auth/refresh` — rotate refresh token.
- `GET /api/auth/me` — return the authenticated user and organization.

## Contact (Public)

- `POST /api/contact` — submit a contact form inquiry (no auth required).

## Billing

- `GET /api/billing/plans` — list active plans.
- `GET /api/billing/subscription` — return current tenant subscription.
- `POST /api/billing/checkout` — create a Stripe Checkout session or local mock checkout.
- `POST /api/billing/webhook` — Stripe webhook endpoint with raw-body signature verification.

## Dashboard And CRM

- `GET /api/dashboard/overview` — conversation, lead, and response-time metrics.
- `GET /api/leads?status=&minScore=&assignedToId=` — filter tenant leads.
- `PATCH /api/leads/:id` — update lead status or assignee.
- `GET /api/customers` — list tenant WhatsApp contacts.
- `POST /api/customers` — create a tenant customer.

## Analytics

- `GET /api/analytics/overview` — conversion rate, resolution rate, agent performance, 30-day trends.

## Appointments

- `GET /api/appointments?status=&from=&to=` — list appointments.
- `POST /api/appointments` — create a manual appointment.
- `PATCH /api/appointments/:id` — update appointment details or status.
- `DELETE /api/appointments/:id` — cancel an appointment.

## Conversations

- `GET /api/conversations` — list recent conversations.
- `GET /api/conversations/:id` — load conversation messages.
- `PATCH /api/conversations/:id/ai` — toggle AI takeover.
- `POST /api/conversations/:id/messages` — send a manual WhatsApp message.

## Knowledge Base

- `POST /api/knowledge/documents` — upload PDF/DOCX; stores the file and queues embeddings.
- `GET /api/knowledge/documents` — list document processing status.
- `GET /api/knowledge/search?q=&limit=` — vector-search tenant knowledge chunks.

## Settings

- `GET /api/settings/organization` — organization profile and subscription.
- `PATCH /api/settings/organization` — update org profile (Admin/Manager).
- `GET /api/settings/business-hours` — list booking availability windows.
- `PUT /api/settings/business-hours` — replace business hours (Admin/Manager).

## Notifications

- `GET /api/notifications?status=` — list tenant notifications.
- `PATCH /api/notifications/:id/read` — mark notification as read.
- `POST /api/notifications/mark-all-read` — mark all as read.

## Team

- `GET /api/team` — list users.
- `POST /api/team/invite` — invite/create a user, enforcing seat caps.
- `PATCH /api/team/:id` — update role or active state.

## WhatsApp

- `GET /api/whatsapp/webhook` — Meta verification challenge.
- `POST /api/whatsapp/webhook` — signed Meta webhook receiver.

## Health

- `GET /health` — API health check.
