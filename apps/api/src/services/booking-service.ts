import { AppointmentStatus, Prisma, prisma, type Customer } from "@dubai-ai/db";

export type ProposedSlot = {
  startsAt: string;
  endsAt: string;
  label: string;
};

const confirmationPattern = /\b(confirm|book it|yes|that works|slot\s*(\d+)|option\s*(\d+))\b/i;

export async function proposeBookingSlots(input: {
  organizationId: string;
  conversationId: string;
  daysToScan?: number;
}) {
  const daysToScan = input.daysToScan ?? 7;
  const now = new Date();
  const slots: ProposedSlot[] = [];

  for (let offset = 0; offset < daysToScan && slots.length < 3; offset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    const dayOfWeek = date.getDay();
    const businessHours = await prisma.businessHour.findMany({
      where: {
        organizationId: input.organizationId,
        dayOfWeek,
        isActive: true
      },
      orderBy: { opensAt: "asc" }
    });

    for (const hours of businessHours) {
      const start = composeDateTime(date, hours.opensAt);
      const endOfDay = composeDateTime(date, hours.closesAt);

      if (start <= now) {
        start.setHours(now.getHours() + 1, 0, 0, 0);
      }

      while (start < endOfDay && slots.length < 3) {
        const endsAt = new Date(start.getTime() + hours.slotMinutes * 60 * 1000);
        if (endsAt <= endOfDay) {
          slots.push({
            startsAt: start.toISOString(),
            endsAt: endsAt.toISOString(),
            label: formatSlotLabel(start)
          });
        }
        start.setMinutes(start.getMinutes() + hours.slotMinutes);
      }
    }
  }

  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: {
      subject: "AI proposed appointment slots"
    }
  });

  return slots;
}

export async function maybeCreateAppointmentFromConfirmation(input: {
  organizationId: string;
  conversationId: string;
  customer: Customer;
  messageText: string;
}) {
  if (!confirmationPattern.test(input.messageText)) {
    return null;
  }

  const recentOutbound = await prisma.message.findMany({
    where: {
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      direction: "OUTBOUND",
      metadata: { not: Prisma.DbNull }
    },
    orderBy: { createdAt: "desc" }
  });

  const lastProposal = recentOutbound.find((message) => {
    const metadata = message.metadata as { bookingSlots?: ProposedSlot[] } | null;
    return Boolean(metadata?.bookingSlots?.length);
  });
  const metadata = lastProposal?.metadata as { bookingSlots?: ProposedSlot[] } | null;
  const slotIndex = extractSlotIndex(input.messageText);
  const selectedSlot = metadata?.bookingSlots?.[slotIndex] ?? metadata?.bookingSlots?.[0];

  if (!selectedSlot) {
    return null;
  }

  const existing = await prisma.appointment.findFirst({
    where: {
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      startsAt: new Date(selectedSlot.startsAt)
    }
  });

  if (existing) {
    return existing;
  }

  const lead = await prisma.lead.findFirst({
    where: {
      organizationId: input.organizationId,
      customerId: input.customer.id
    },
    orderBy: { updatedAt: "desc" }
  });

  return prisma.appointment.create({
    data: {
      organizationId: input.organizationId,
      customerId: input.customer.id,
      leadId: lead?.id,
      conversationId: input.conversationId,
      title: `WhatsApp appointment with ${input.customer.name ?? input.customer.phone}`,
      startsAt: new Date(selectedSlot.startsAt),
      endsAt: new Date(selectedSlot.endsAt),
      status: AppointmentStatus.CONFIRMED,
      source: "AI_WHATSAPP",
      metadata: {
        selectedFromMessage: input.messageText,
        selectedSlot
      }
    }
  });
}

function composeDateTime(date: Date, hhmm: string) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function formatSlotLabel(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dubai"
  }).format(date);
}

function extractSlotIndex(text: string) {
  const match = text.match(/\b(?:slot|option)\s*(\d+)\b/i);
  if (!match) {
    return 0;
  }

  return Math.max(0, Number(match[1]) - 1);
}
