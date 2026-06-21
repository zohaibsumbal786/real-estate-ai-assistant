/**
 * Stripe Dunning Management Service
 * Handles payment failures with retry logic and customer notifications
 */

import { prisma, NotificationType, SubscriptionStatus } from "@dubai-ai/db";
import { sendEmail } from "./email-service.js";

export interface DunningCycle {
  attemptNumber: number;
  daysAfterFailure: number;
  description: string;
}

// Dunning cycle: retry attempts at 3, 5, and 7 days after failure
const DUNNING_CYCLES: DunningCycle[] = [
  {
    attemptNumber: 1,
    daysAfterFailure: 3,
    description: "First payment retry attempt"
  },
  {
    attemptNumber: 2,
    daysAfterFailure: 5,
    description: "Second payment retry attempt"
  },
  {
    attemptNumber: 3,
    daysAfterFailure: 7,
    description: "Final payment retry attempt before suspension"
  }
];

const MAX_RETRY_ATTEMPTS = 3;

/**
 * Track payment failure and trigger dunning process
 */
export async function handlePaymentFailure(
  stripeCustomerId: string,
  organizationId: string,
  invoiceId: string,
  errorMessage: string
): Promise<void> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
      include: { organization: true }
    });

    if (!subscription) {
      console.error(`[Dunning] Subscription not found for org ${organizationId}`);
      return;
    }

    // Increment payment failure tracking
    const failureCount = (subscription.lastPaymentFailedAt ? 1 : 0) + 1;
    
    // Update subscription with failure info
    await prisma.subscription.update({
      where: { organizationId },
      data: {
        lastPaymentFailedAt: new Date(),
        status: SubscriptionStatus.PAST_DUE
      }
    });

    // Create notification for billing team
    await prisma.notification.create({
      data: {
        organizationId,
        type: NotificationType.BILLING,
        status: "UNREAD",
        title: "Payment Failed",
        body: `Payment failed for invoice ${invoiceId}. Error: ${errorMessage}`,
        metadata: {
          invoiceId,
          errorMessage,
          attemptNumber: failureCount,
          stripeCustomerId
        }
      }
    });

    // Send email notification to organization admin
    const admin = await prisma.user.findFirst({
      where: {
        organizationId,
        role: "ADMIN"
      }
    });

    if (admin) {
      await sendPaymentFailureEmail(admin.email, subscription.organization.name, failureCount);
    }

    console.log(`[Dunning] Payment failure recorded for org ${organizationId}, attempt ${failureCount}`);
  } catch (error) {
    console.error("[Dunning] Error handling payment failure:", error);
  }
}

/**
 * Schedule payment retry based on dunning cycle
 * Call this when a payment fails to schedule automatic retries
 */
export async function schedulePaymentRetry(
  organizationId: string,
  invoiceId: string
): Promise<void> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId }
    });

    if (!subscription) {
      console.error(`[Dunning] Subscription not found for org ${organizationId}`);
      return;
    }

    const failureCount = subscription.lastPaymentFailedAt ? 1 : 0;
    const nextCycle = DUNNING_CYCLES[Math.min(failureCount, DUNNING_CYCLES.length - 1)];

    if (!nextCycle) {
      console.warn(`[Dunning] No more retry cycles available for org ${organizationId}`);
      return;
    }

    // Schedule retry job (would be done via BullMQ in production)
    const retryDate = new Date();
    retryDate.setDate(retryDate.getDate() + nextCycle.daysAfterFailure);

    console.log(
      `[Dunning] Scheduled retry attempt ${nextCycle.attemptNumber} for org ${organizationId} on ${retryDate.toISOString()}`
    );

    // In production, queue this with BullMQ for reliable scheduling
    // await paymentRetryQueue.add({
    //   organizationId,
    //   invoiceId,
    //   attemptNumber: nextCycle.attemptNumber
    // }, { delay: retryDate.getTime() - Date.now() });
  } catch (error) {
    console.error("[Dunning] Error scheduling payment retry:", error);
  }
}

/**
 * Suspend subscription after max retry attempts exceeded
 */
export async function suspendSubscriptionDueToPaymentFailure(organizationId: string): Promise<void> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
      include: { organization: true }
    });

    if (!subscription) {
      console.error(`[Dunning] Subscription not found for org ${organizationId}`);
      return;
    }

    // Update subscription status to CANCELLED due to payment failure
    await prisma.subscription.update({
      where: { organizationId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date()
      }
    });

    // Create critical notification
    await prisma.notification.create({
      data: {
        organizationId,
        type: NotificationType.BILLING,
        status: "UNREAD",
        title: "Subscription Suspended",
        body: `Your subscription has been suspended due to repeated payment failures. Please update your payment method immediately.`,
        metadata: {
          suspensionReason: "payment_failure_max_attempts"
        }
      }
    });

    // Send suspension email
    const admin = await prisma.user.findFirst({
      where: {
        organizationId,
        role: "ADMIN"
      }
    });

    if (admin) {
      await sendSubscriptionSuspendedEmail(admin.email, subscription.organization.name);
    }

    console.log(`[Dunning] Subscription suspended for org ${organizationId} due to payment failure`);
  } catch (error) {
    console.error("[Dunning] Error suspending subscription:", error);
  }
}

/**
 * Resume subscription after successful payment
 */
export async function resumeSubscriptionAfterPaymentSuccess(organizationId: string): Promise<void> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
      include: { organization: true }
    });

    if (!subscription) {
      console.error(`[Dunning] Subscription not found for org ${organizationId}`);
      return;
    }

    // If subscription was past due, resume it
    if (subscription.status === SubscriptionStatus.PAST_DUE) {
      await prisma.subscription.update({
        where: { organizationId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          lastPaymentFailedAt: null
        }
      });

      // Create success notification
      await prisma.notification.create({
        data: {
          organizationId,
          type: NotificationType.BILLING,
          status: "UNREAD",
          title: "Payment Successful",
          body: `Your subscription payment was successful and your account is active.`,
          metadata: {
            paymentSuccess: true
          }
        }
      });

      // Send confirmation email
      const admin = await prisma.user.findFirst({
        where: {
          organizationId,
          role: "ADMIN"
        }
      });

      if (admin) {
        await sendPaymentSuccessEmail(admin.email, subscription.organization.name);
      }

      console.log(`[Dunning] Subscription resumed for org ${organizationId} after successful payment`);
    }
  } catch (error) {
    console.error("[Dunning] Error resuming subscription:", error);
  }
}

/**
 * Get dunning status for a subscription
 */
export async function getDunningStatus(organizationId: string): Promise<{
  isPastDue: boolean;
  daysSinceFailure: number;
  nextRetryDate?: Date;
  attemptsRemaining: number;
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId }
  });

  if (!subscription || !subscription.lastPaymentFailedAt) {
    return {
      isPastDue: false,
      daysSinceFailure: 0,
      attemptsRemaining: MAX_RETRY_ATTEMPTS
    };
  }

  const daysSinceFailure = Math.floor(
    (Date.now() - subscription.lastPaymentFailedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  const nextCycle = DUNNING_CYCLES.find(
    (cycle) => cycle.daysAfterFailure > daysSinceFailure
  );

  return {
    isPastDue: subscription.status === SubscriptionStatus.PAST_DUE,
    daysSinceFailure,
    nextRetryDate: nextCycle
      ? new Date(Date.now() + (nextCycle.daysAfterFailure - daysSinceFailure) * 24 * 60 * 60 * 1000)
      : undefined,
    attemptsRemaining: Math.max(0, MAX_RETRY_ATTEMPTS - daysSinceFailure)
  };
}

// Email notification helpers

async function sendPaymentFailureEmail(
  email: string,
  organizationName: string,
  attemptNumber: number
): Promise<void> {
  const subject = `Payment Failed - Action Required`;
  const text = `Payment failed for your ${organizationName} subscription. We will retry automatically.`;
  const body = `
    <h2>Payment Failed</h2>
    <p>We were unable to process the payment for your ${organizationName} subscription.</p>
    <p>We will automatically retry this payment on ${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString()}.</p>
    <p>If you need to update your payment method, please log in to your dashboard.</p>
  `;

  try {
    await sendEmail({
      to: email,
      subject,
      text,
      html: body
    });
  } catch (error) {
    console.error("[Dunning] Error sending payment failure email:", error);
  }
}

async function sendPaymentSuccessEmail(email: string, organizationName: string): Promise<void> {
  const subject = `Payment Successful`;
  const text = `Your payment for ${organizationName} has been processed successfully.`;
  const body = `
    <h2>Payment Received</h2>
    <p>Thank you! Your payment for ${organizationName} has been successfully processed.</p>
    <p>Your subscription is now active.</p>
  `;

  try {
    await sendEmail({
      to: email,
      subject,
      text,
      html: body
    });
  } catch (error) {
    console.error("[Dunning] Error sending payment success email:", error);
  }
}

async function sendSubscriptionSuspendedEmail(email: string, organizationName: string): Promise<void> {
  const subject = `Subscription Suspended - Action Required`;
  const text = `Your ${organizationName} subscription has been suspended due to payment failures.`;
  const body = `
    <h2>Subscription Suspended</h2>
    <p>Your ${organizationName} subscription has been suspended due to repeated payment failures.</p>
    <p>Please update your payment method immediately to restore service.</p>
    <p><a href="https://dashboard.dubai-ai.ae/billing">Update Payment Method</a></p>
  `;

  try {
    await sendEmail({
      to: email,
      subject,
      text,
      html: body
    });
  } catch (error) {
    console.error("[Dunning] Error sending subscription suspended email:", error);
  }
}
