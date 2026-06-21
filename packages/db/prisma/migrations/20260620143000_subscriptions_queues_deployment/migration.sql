ALTER TABLE "Appointment"
  ADD COLUMN "reminder24hSentAt" TIMESTAMP(3),
  ADD COLUMN "reminder1hSentAt" TIMESTAMP(3);

ALTER TABLE "Plan"
  ADD COLUMN "stripePriceId" TEXT;

ALTER TABLE "Subscription"
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "stripeCheckoutSessionId" TEXT,
  ADD COLUMN "lastPaymentFailedAt" TIMESTAMP(3);

CREATE INDEX "Appointment_organizationId_reminder24hSentAt_idx"
  ON "Appointment"("organizationId", "reminder24hSentAt");

CREATE INDEX "Appointment_organizationId_reminder1hSentAt_idx"
  ON "Appointment"("organizationId", "reminder1hSentAt");

CREATE UNIQUE INDEX "Plan_stripePriceId_key"
  ON "Plan"("stripePriceId");

CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key"
  ON "Subscription"("stripeSubscriptionId");

CREATE INDEX "Subscription_stripeCustomerId_idx"
  ON "Subscription"("stripeCustomerId");
