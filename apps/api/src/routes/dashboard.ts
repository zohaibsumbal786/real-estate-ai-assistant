import { Router } from "express";
import { ConversationStatus, LeadStatus, MessageDirection, prisma } from "@dubai-ai/db";
import { authenticate, enforceTenant } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, enforceTenant);

dashboardRouter.get("/overview", async (req, res, next) => {
  try {
    const organizationId = req.tenantId!;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Aggregate all counts in a single query to avoid N+1
    const [
      aggregateCounts,
      messageSeries,
      leadSeries,
      responseRows,
      recentMessages
    ] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          conversationsTotal: bigint;
          conversationsOpen: bigint;
          needsHuman: bigint;
          leadsWon: bigint;
          leadCount: bigint;
        }>
      >`
        SELECT
          (SELECT count(*) FROM "Conversation" WHERE "organizationId" = ${organizationId}) AS "conversationsTotal",
          (SELECT count(*) FROM "Conversation" WHERE "organizationId" = ${organizationId} AND status IN ('OPEN', 'PENDING')) AS "conversationsOpen",
          (SELECT count(*) FROM "Conversation" WHERE "organizationId" = ${organizationId} AND "needsHuman" = true) AS "needsHuman",
          (SELECT count(*) FROM "Lead" WHERE "organizationId" = ${organizationId} AND status = 'WON') AS "leadsWon",
          (SELECT count(*) FROM "Lead" WHERE "organizationId" = ${organizationId}) AS "leadCount"
      `,
      prisma.$queryRaw<Array<{ day: Date; conversations: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day, count(*) AS conversations
        FROM "Conversation"
        WHERE "organizationId" = ${organizationId} AND "createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1
      `,
      prisma.$queryRaw<Array<{ day: Date; leads: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day, count(*) AS leads
        FROM "Lead"
        WHERE "organizationId" = ${organizationId} AND "createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1
      `,
      prisma.$queryRaw<Array<{ seconds: number }>>`
        WITH inbound AS (
          SELECT id, "conversationId", "sentAt",
            lead("sentAt") OVER (
              PARTITION BY "conversationId"
              ORDER BY "sentAt"
            ) AS next_at,
            lead(direction) OVER (
              PARTITION BY "conversationId"
              ORDER BY "sentAt"
            ) AS next_direction
          FROM "Message"
          WHERE "organizationId" = ${organizationId}
        )
        SELECT EXTRACT(EPOCH FROM (next_at - "sentAt"))::float AS seconds
        FROM inbound
        WHERE next_direction = 'OUTBOUND'::"MessageDirection" AND next_at IS NOT NULL
      `,
      prisma.message.findMany({
        where: { organizationId, direction: MessageDirection.INBOUND },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          customer: true,
          conversation: true
        }
      })
    ]);

    const counts = aggregateCounts[0];
    const conversationsTotal = Number(counts.conversationsTotal);
    const conversationsOpen = Number(counts.conversationsOpen);
    const needsHuman = Number(counts.needsHuman);
    const leadsWon = Number(counts.leadsWon);
    const leadCount = Number(counts.leadCount);

    const averageResponseSeconds = responseRows.length
      ? Math.round(responseRows.reduce((sum, row) => sum + Number(row.seconds), 0) / responseRows.length)
      : 0;

    const seriesByDay = new Map<string, { day: string; conversations: number; leads: number }>();

    for (const row of messageSeries) {
      const day = row.day.toISOString().slice(0, 10);
      seriesByDay.set(day, { day, conversations: Number(row.conversations), leads: 0 });
    }

    for (const row of leadSeries) {
      const day = row.day.toISOString().slice(0, 10);
      const current = seriesByDay.get(day) ?? { day, conversations: 0, leads: 0 };
      current.leads = Number(row.leads);
      seriesByDay.set(day, current);
    }

    res.json({
      metrics: {
        conversationsTotal,
        conversationsOpen,
        needsHuman,
        leadsWon,
        leadCount,
        averageResponseSeconds
      },
      series: Array.from(seriesByDay.values()).sort((a, b) => a.day.localeCompare(b.day)),
      recentMessages
    });
  } catch (error) {
    next(error);
  }
});
