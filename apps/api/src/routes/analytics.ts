import { Router } from "express";
import { ConversationStatus, LeadStatus, MessageDirection, prisma } from "@dubai-ai/db";
import { authenticate, enforceTenant } from "../middleware/auth.js";

export const analyticsRouter = Router();

analyticsRouter.use(authenticate, enforceTenant);

analyticsRouter.get("/overview", async (req, res, next) => {
  try {
    const organizationId = req.tenantId!;
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalConversations,
      resolvedConversations,
      totalLeads,
      wonLeads,
      lostLeads,
      activeCustomers,
      appointmentsTotal,
      appointmentsCompleted,
      responseRows,
      dailyConversations,
      dailyLeads,
      leadStatusBreakdown,
      agentPerformance
    ] = await Promise.all([
      prisma.conversation.count({ where: { organizationId } }),
      prisma.conversation.count({
        where: { organizationId, status: ConversationStatus.RESOLVED }
      }),
      prisma.lead.count({ where: { organizationId } }),
      prisma.lead.count({ where: { organizationId, status: LeadStatus.WON } }),
      prisma.lead.count({ where: { organizationId, status: LeadStatus.LOST } }),
      prisma.customer.count({ where: { organizationId, lastSeenAt: { gte: since7 } } }),
      prisma.appointment.count({ where: { organizationId } }),
      prisma.appointment.count({
        where: { organizationId, status: "COMPLETED" }
      }),
      prisma.$queryRaw<Array<{ seconds: number }>>`
        WITH inbound AS (
          SELECT id, "conversationId", "sentAt",
            lead("sentAt") OVER (PARTITION BY "conversationId" ORDER BY "sentAt") AS next_at,
            lead(direction) OVER (PARTITION BY "conversationId" ORDER BY "sentAt") AS next_direction
          FROM "Message"
          WHERE "organizationId" = ${organizationId} AND "sentAt" >= ${since30}
        )
        SELECT EXTRACT(EPOCH FROM (next_at - "sentAt"))::float AS seconds
        FROM inbound
        WHERE next_direction = 'OUTBOUND'::"MessageDirection" AND next_at IS NOT NULL
      `,
      prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day, count(*) AS count
        FROM "Conversation"
        WHERE "organizationId" = ${organizationId} AND "createdAt" >= ${since30}
        GROUP BY 1 ORDER BY 1
      `,
      prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day, count(*) AS count
        FROM "Lead"
        WHERE "organizationId" = ${organizationId} AND "createdAt" >= ${since30}
        GROUP BY 1 ORDER BY 1
      `,
      prisma.lead.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: { _all: true }
      }),
      prisma.$queryRaw<
        Array<{ agentId: string; agentName: string; conversations: bigint; leadsWon: bigint }>
      >`
        SELECT u.id AS "agentId", u.name AS "agentName",
          count(DISTINCT c.id) AS conversations,
          count(DISTINCT CASE WHEN l.status = 'WON' THEN l.id END) AS "leadsWon"
        FROM "User" u
        LEFT JOIN "Conversation" c ON c."assignedToId" = u.id AND c."organizationId" = ${organizationId}
        LEFT JOIN "Lead" l ON l."assignedToId" = u.id AND l."organizationId" = ${organizationId}
        WHERE u."organizationId" = ${organizationId} AND u."isActive" = true
        GROUP BY u.id, u.name
        ORDER BY conversations DESC
      `
    ]);

    const avgResponseSeconds = responseRows.length
      ? Math.round(responseRows.reduce((sum, row) => sum + Number(row.seconds), 0) / responseRows.length)
      : 0;

    const conversionRate =
      totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 1000) / 10 : 0;

    const resolutionRate =
      totalConversations > 0
        ? Math.round((resolvedConversations / totalConversations) * 1000) / 10
        : 0;

    const satisfactionScore =
      resolutionRate > 0 ? Math.min(5, Math.round((resolutionRate / 20) * 10) / 10) : null;

    const inboundCount = await prisma.message.count({
      where: { organizationId, direction: MessageDirection.INBOUND, sentAt: { gte: since30 } }
    });

    const outboundCount = await prisma.message.count({
      where: { organizationId, direction: MessageDirection.OUTBOUND, sentAt: { gte: since30 } }
    });

    res.json({
      metrics: {
        totalConversations,
        resolvedConversations,
        resolutionRate,
        totalLeads,
        wonLeads,
        lostLeads,
        conversionRate,
        activeCustomers,
        appointmentsTotal,
        appointmentsCompleted,
        avgResponseSeconds,
        satisfactionScore,
        inboundMessages: inboundCount,
        outboundMessages: outboundCount
      },
      dailyConversations: dailyConversations.map((row) => ({
        day: row.day.toISOString().slice(0, 10),
        count: Number(row.count)
      })),
      dailyLeads: dailyLeads.map((row) => ({
        day: row.day.toISOString().slice(0, 10),
        count: Number(row.count)
      })),
      leadStatusBreakdown: leadStatusBreakdown.map((row) => ({
        status: row.status,
        count: row._count._all
      })),
      agentPerformance: agentPerformance.map((row) => ({
        agentId: row.agentId,
        agentName: row.agentName,
        conversations: Number(row.conversations),
        leadsWon: Number(row.leadsWon)
      }))
    });
  } catch (error) {
    next(error);
  }
});
