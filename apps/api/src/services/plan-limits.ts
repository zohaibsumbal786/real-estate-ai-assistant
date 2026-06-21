import { prisma, SubscriptionStatus } from "@dubai-ai/db";
import { HttpError } from "../lib/http-error.js";

const activeStatuses: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING
];

// Soft limit threshold - warn when usage exceeds this percentage
const SOFT_LIMIT_THRESHOLD = 0.8; // 80%

export interface LimitStatus {
  isAtLimit: boolean;
  isNearLimit: boolean;
  usage: number;
  limit: number;
  percentageUsed: number;
  remainingQuota: number;
}

export async function getActiveSubscriptionWithPlan(organizationId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      organizationId,
      status: { in: activeStatuses },
      currentPeriodEnd: { gt: new Date() }
    },
    include: { plan: true }
  });

  if (!subscription) {
    throw new HttpError(402, "An active subscription is required", "SUBSCRIPTION_REQUIRED");
  }

  return subscription;
}

export async function getSeatLimitStatus(organizationId: string): Promise<LimitStatus> {
  const subscription = await getActiveSubscriptionWithPlan(organizationId);
  const activeSeats = await prisma.user.count({
    where: { organizationId, isActive: true }
  });

  const percentageUsed = (activeSeats / subscription.plan.seatLimit) * 100;
  const isAtLimit = activeSeats >= subscription.plan.seatLimit;
  const isNearLimit = percentageUsed >= SOFT_LIMIT_THRESHOLD * 100;

  return {
    isAtLimit,
    isNearLimit,
    usage: activeSeats,
    limit: subscription.plan.seatLimit,
    percentageUsed,
    remainingQuota: Math.max(0, subscription.plan.seatLimit - activeSeats)
  };
}

export async function getKnowledgeDocumentLimitStatus(organizationId: string): Promise<LimitStatus> {
  const subscription = await getActiveSubscriptionWithPlan(organizationId);
  const documents = await prisma.knowledgeDocument.count({
    where: { organizationId }
  });

  const percentageUsed = (documents / subscription.plan.knowledgeDocumentLimit) * 100;
  const isAtLimit = documents >= subscription.plan.knowledgeDocumentLimit;
  const isNearLimit = percentageUsed >= SOFT_LIMIT_THRESHOLD * 100;

  return {
    isAtLimit,
    isNearLimit,
    usage: documents,
    limit: subscription.plan.knowledgeDocumentLimit,
    percentageUsed,
    remainingQuota: Math.max(0, subscription.plan.knowledgeDocumentLimit - documents)
  };
}

export async function getMessageLimitStatus(organizationId: string): Promise<LimitStatus> {
  const subscription = await getActiveSubscriptionWithPlan(organizationId);
  const messageCount = await prisma.message.count({
    where: {
      organizationId,
      createdAt: {
        gte: subscription.currentPeriodStart,
        lt: subscription.currentPeriodEnd
      }
    }
  });

  const percentageUsed = (messageCount / subscription.plan.messageLimit) * 100;
  const isAtLimit = messageCount >= subscription.plan.messageLimit;
  const isNearLimit = percentageUsed >= SOFT_LIMIT_THRESHOLD * 100;

  return {
    isAtLimit,
    isNearLimit,
    usage: messageCount,
    limit: subscription.plan.messageLimit,
    percentageUsed,
    remainingQuota: Math.max(0, subscription.plan.messageLimit - messageCount)
  };
}

/**
 * Hard limit enforcement - blocks action when limit is reached
 */
export async function assertSeatLimit(organizationId: string) {
  const status = await getSeatLimitStatus(organizationId);
  
  if (status.isAtLimit) {
    throw new HttpError(
      402,
      `You have reached the maximum number of team seats. Please upgrade your plan to add more members.`,
      "PLAN_SEAT_LIMIT_REACHED"
    );
  }
}

export async function assertKnowledgeDocumentLimit(organizationId: string) {
  const status = await getKnowledgeDocumentLimitStatus(organizationId);
  
  if (status.isAtLimit) {
    throw new HttpError(
      402,
      `You have reached the maximum number of knowledge documents. Please upgrade your plan to add more.`,
      "PLAN_DOCUMENT_LIMIT_REACHED"
    );
  }
}

export async function assertMessageLimit(organizationId: string) {
  const status = await getMessageLimitStatus(organizationId);
  
  if (status.isAtLimit) {
    throw new HttpError(
      402,
      `You have reached your message limit for this billing period. Please upgrade your plan to continue.`,
      "PLAN_MESSAGE_LIMIT_REACHED"
    );
  }
}

/**
 * Get warnings for limits that are nearing threshold
 * Returns array of warnings to display to users
 */
export async function getPlanLimitWarnings(organizationId: string): Promise<string[]> {
  try {
    const warnings: string[] = [];

    const [seatStatus, docStatus, messageStatus] = await Promise.all([
      getSeatLimitStatus(organizationId),
      getKnowledgeDocumentLimitStatus(organizationId),
      getMessageLimitStatus(organizationId)
    ]);

    if (seatStatus.isNearLimit && !seatStatus.isAtLimit) {
      warnings.push(
        `You have used ${seatStatus.percentageUsed.toFixed(0)}% of your team seat limit. ` +
        `Only ${seatStatus.remainingQuota} seat(s) remaining.`
      );
    }

    if (docStatus.isNearLimit && !docStatus.isAtLimit) {
      warnings.push(
        `You have used ${docStatus.percentageUsed.toFixed(0)}% of your knowledge document limit. ` +
        `Only ${docStatus.remainingQuota} document(s) remaining.`
      );
    }

    if (messageStatus.isNearLimit && !messageStatus.isAtLimit) {
      warnings.push(
        `You have used ${messageStatus.percentageUsed.toFixed(0)}% of your message limit for this billing period. ` +
        `Only ${messageStatus.remainingQuota} message(s) remaining.`
      );
    }

    return warnings;
  } catch (error) {
    // Return empty warnings if subscription check fails
    return [];
  }
}
