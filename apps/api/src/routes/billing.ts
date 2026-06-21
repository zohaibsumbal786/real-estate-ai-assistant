import { Router } from "express";
import type { Request } from "express";
import Stripe from "stripe";
import { NotificationType, SubscriptionStatus, prisma } from "@dubai-ai/db";
import { z } from "zod";
import { config } from "../config.js";
import { authenticate, enforceTenant } from "../middleware/auth.js";
import { webhookRateLimiter } from "../middleware/rate-limit.js";
import { HttpError } from "../lib/http-error.js";
import { sendFailedPaymentAlert } from "../services/email-service.js";
import { 
  handlePaymentFailure, 
  resumeSubscriptionAfterPaymentSuccess 
} from "../services/dunning-service.js";

export const billingRouter = Router();
export const billingWebhookRouter = Router();

const stripe = config.STRIPE_SECRET_KEY ? new Stripe(config.STRIPE_SECRET_KEY) : null;

const checkoutSchema = z.object({
  planSlug: z.string().min(2)
});

billingRouter.use(authenticate, enforceTenant);

billingRouter.get("/plans", async (_req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPriceAED: "asc" }
    });
    res.json({ data: plans });
  } catch (error) {
    next(error);
  }
});

billingRouter.get("/subscription", async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: req.tenantId! },
      include: { plan: true }
    });
    res.json({ data: subscription });
  } catch (error) {
    next(error);
  }
});

billingRouter.post("/checkout", async (req, res, next) => {
  try {
    const payload = checkoutSchema.parse(req.body);
    const [plan, organization, user] = await Promise.all([
      prisma.plan.findUnique({ where: { slug: payload.planSlug } }),
      prisma.organization.findUniqueOrThrow({ where: { id: req.tenantId! } }),
      prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } })
    ]);

    if (!plan?.isActive) {
      throw new HttpError(404, "Plan not found", "PLAN_NOT_FOUND");
    }

    if (!plan.stripePriceId) {
      throw new HttpError(400, "Plan is missing a Stripe price id", "PLAN_NOT_BILLABLE");
    }

    if (config.STRIPE_MOCK_CHECKOUT || !stripe || plan.stripePriceId.endsWith("_mock")) {
      const mockSessionId = `cs_mock_${Date.now()}`;
      const subscription = await prisma.subscription.upsert({
        where: { organizationId: organization.id },
        update: {
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          stripeCheckoutSessionId: mockSessionId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          cancelledAt: null
        },
        create: {
          organizationId: organization.id,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          stripeCheckoutSessionId: mockSessionId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        include: { plan: true }
      });

      return res.status(201).json({
        mock: true,
        checkoutSessionId: mockSessionId,
        url: `${config.BILLING_SUCCESS_URL}&session_id=${mockSessionId}`,
        subscription
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      client_reference_id: organization.id,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${config.BILLING_SUCCESS_URL}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: config.BILLING_CANCEL_URL,
      metadata: {
        organizationId: organization.id,
        planId: plan.id,
        planSlug: plan.slug
      },
      subscription_data: {
        metadata: {
          organizationId: organization.id,
          planId: plan.id,
          planSlug: plan.slug
        }
      }
    });

    return res.status(201).json({
      mock: false,
      checkoutSessionId: session.id,
      url: session.url
    });
  } catch (error) {
    next(error);
  }
});

billingWebhookRouter.post("/", webhookRateLimiter, async (req, res, next) => {
  try {
    const event = buildStripeEvent(req);
    await handleStripeEvent(event);
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

function buildStripeEvent(req: Request) {
  if (!stripe || !config.STRIPE_WEBHOOK_SECRET) {
    const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString("utf8")) : req.body;
    return body as Stripe.Event;
  }

  const signature = req.header("stripe-signature");
  if (!signature) {
    throw new HttpError(400, "Missing Stripe signature", "STRIPE_SIGNATURE_REQUIRED");
  }

  return stripe.webhooks.constructEvent(req.body, signature, config.STRIPE_WEBHOOK_SECRET);
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscriptionFromStripe(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await cancelSubscriptionFromStripe(event.data.object as Stripe.Subscription);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case "invoice.created":
      await handleInvoiceCreated(event.data.object as Stripe.Invoice);
      break;
    case "charge.refunded":
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      break;
    case "customer.updated":
      await handleCustomerUpdated(event.data.object as Stripe.Customer);
      break;
    default:
      console.log("[Stripe webhook] ignored event", event.type);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organizationId ?? session.client_reference_id;
  const planId = session.metadata?.planId;

  if (!organizationId || !planId) {
    console.warn("[Stripe webhook] checkout session missing metadata", session.id);
    return;
  }

  await prisma.subscription.upsert({
    where: { organizationId },
    update: {
      planId,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: stringId(session.customer),
      stripeSubscriptionId: stringId(session.subscription),
      stripeCheckoutSessionId: session.id,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelledAt: null
    },
    create: {
      organizationId,
      planId,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: stringId(session.customer),
      stripeSubscriptionId: stringId(session.subscription),
      stripeCheckoutSessionId: session.id,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });
}

async function upsertSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const raw = subscription as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };
  const organizationId = subscription.metadata?.organizationId;
  const planId = subscription.metadata?.planId;

  if (!organizationId || !planId) {
    console.warn("[Stripe webhook] subscription missing metadata", subscription.id);
    return;
  }

  await prisma.subscription.upsert({
    where: { organizationId },
    update: {
      planId,
      stripeCustomerId: stringId(subscription.customer),
      stripeSubscriptionId: subscription.id,
      status: mapStripeSubscriptionStatus(subscription.status),
      currentPeriodStart: stripeSecondsToDate(raw.current_period_start) ?? new Date(),
      currentPeriodEnd:
        stripeSecondsToDate(raw.current_period_end) ??
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelledAt: subscription.cancel_at_period_end ? new Date() : null
    },
    create: {
      organizationId,
      planId,
      stripeCustomerId: stringId(subscription.customer),
      stripeSubscriptionId: subscription.id,
      status: mapStripeSubscriptionStatus(subscription.status),
      currentPeriodStart: stripeSecondsToDate(raw.current_period_start) ?? new Date(),
      currentPeriodEnd:
        stripeSecondsToDate(raw.current_period_end) ??
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });
}

async function cancelSubscriptionFromStripe(subscription: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: SubscriptionStatus.CANCELLED,
      cancelledAt: new Date()
    }
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const raw = invoice as unknown as {
    subscription?: string | Stripe.Subscription;
    parent?: { subscription_details?: { subscription?: string } };
  };
  const stripeSubscriptionId =
    stringId(raw.subscription) ?? raw.parent?.subscription_details?.subscription;
  const stripeCustomerId = stringId(invoice.customer);

  const subscription = await prisma.subscription.findFirst({
    where: {
      OR: [
        ...(stripeSubscriptionId ? [{ stripeSubscriptionId }] : []),
        ...(stripeCustomerId ? [{ stripeCustomerId }] : [])
      ]
    },
    include: {
      organization: true,
      plan: true
    }
  });

  if (!subscription) {
    console.warn("[Stripe webhook] failed invoice without matching subscription", invoice.id);
    return;
  }

  // Use dunning service to handle payment failure with retry logic
  await handlePaymentFailure(
    stripeCustomerId || "",
    subscription.organizationId,
    invoice.id,
    (invoice as any).last_payment_error?.message || "Unknown payment error"
  );

  await sendFailedPaymentAlert({
    organizationName: subscription.organization.name,
    planName: subscription.plan.name,
    stripeCustomerId: stripeCustomerId || ""
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const raw = invoice as unknown as {
    subscription?: string | Stripe.Subscription;
  };
  const stripeSubscriptionId = stringId(raw.subscription);
  const stripeCustomerId = stringId(invoice.customer);

  if (!stripeSubscriptionId && !stripeCustomerId) {
    console.warn("[Stripe webhook] payment succeeded without subscription/customer info");
    return;
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      OR: [
        ...(stripeSubscriptionId ? [{ stripeSubscriptionId }] : []),
        ...(stripeCustomerId ? [{ stripeCustomerId }] : [])
      ]
    },
    include: { organization: true, plan: true }
  });

  if (!subscription) {
    console.warn("[Stripe webhook] payment succeeded for unknown subscription");
    return;
  }

  // Use dunning service to handle payment success
  // This will resume subscription if it was in PAST_DUE status
  await resumeSubscriptionAfterPaymentSuccess(subscription.organizationId);

  console.log("[Stripe webhook] payment succeeded", {
    subscriptionId: subscription.id,
    organizationId: subscription.organizationId
  });
}

async function handleInvoiceCreated(invoice: Stripe.Invoice) {
  // Track trial invoices or upcoming invoices for record-keeping
  const stripeSubscriptionId = stringId(
    (invoice as unknown as { subscription?: string }).subscription
  );
  const stripeCustomerId = stringId(invoice.customer);

  if (!stripeSubscriptionId && !stripeCustomerId) {
    return;
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      OR: [
        ...(stripeSubscriptionId ? [{ stripeSubscriptionId }] : []),
        ...(stripeCustomerId ? [{ stripeCustomerId }] : [])
      ]
    }
  });

  if (subscription) {
    // Log invoice creation for audit purposes
    console.log("[Stripe webhook] invoice created for subscription", {
      invoiceId: invoice.id,
      subscriptionId: subscription.id,
      amount: invoice.amount_due
    });
  }

  console.log("[Stripe webhook] invoice created", { invoiceId: invoice.id });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const raw = charge as unknown as { invoice?: string };
  const invoiceId = stringId(raw.invoice);
  const customerId = stringId(charge.customer);

  if (!customerId) {
    console.warn("[Stripe webhook] refund without customer");
    return;
  }

  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    include: { organization: true, plan: true }
  });

  if (subscription) {
    await prisma.notification.create({
      data: {
        organizationId: subscription.organizationId,
        type: NotificationType.BILLING,
        title: "Refund processed",
        body: `A refund of AED ${(charge.amount / 100).toFixed(2)} has been processed.`,
        metadata: {
          stripeChargeId: charge.id,
          refundAmount: charge.amount,
          invoiceId
        }
      }
    });

    console.log("[Stripe webhook] charge refunded", {
      subscriptionId: subscription.id,
      refundAmount: charge.amount
    });
  }
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  const raw = customer as unknown as {
    invoice_settings?: { default_payment_method?: string };
  };
  const defaultPaymentMethod = raw.invoice_settings?.default_payment_method;

  if (!customer.id) {
    return;
  }

  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customer.id }
  });

  if (subscription && defaultPaymentMethod) {
    console.log("[Stripe webhook] customer payment method updated", {
      customerId: customer.id,
      subscriptionId: subscription.id,
      paymentMethodId: defaultPaymentMethod
    });
  }
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "past_due":
    case "unpaid":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
      return SubscriptionStatus.CANCELLED;
    default:
      return SubscriptionStatus.EXPIRED;
  }
}

function stringId(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function stripeSecondsToDate(seconds?: number) {
  return seconds ? new Date(seconds * 1000) : undefined;
}
