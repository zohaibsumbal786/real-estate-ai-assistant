import { AppointmentStatus, NotificationType, prisma } from "@dubai-ai/db";
import { sendWhatsAppText } from "./meta-cloud-api.js";

const reminderStatuses = [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED];

export async function sendDueAppointmentReminders(now = new Date()) {
  const oneHour = 60 * 60 * 1000;
  const fiveMinutes = 5 * 60 * 1000;
  const windows = [
    {
      name: "24h",
      startsAtFrom: new Date(now.getTime() + 24 * oneHour),
      startsAtTo: new Date(now.getTime() + 24 * oneHour + fiveMinutes),
      sentField: "reminder24hSentAt" as const
    },
    {
      name: "1h",
      startsAtFrom: new Date(now.getTime() + oneHour),
      startsAtTo: new Date(now.getTime() + oneHour + fiveMinutes),
      sentField: "reminder1hSentAt" as const
    }
  ];

  const results = [];

  for (const window of windows) {
    const appointments = await prisma.appointment.findMany({
      where: {
        status: { in: reminderStatuses },
        startsAt: {
          gte: window.startsAtFrom,
          lt: window.startsAtTo
        },
        [window.sentField]: null
      },
      include: {
        organization: true,
        customer: true,
        lead: true
      }
    });

    for (const appointment of appointments) {
      if (!appointment.customer?.phone) {
        continue;
      }

      const body = buildReminderBody({
        organizationName: appointment.organization.name,
        customerName: appointment.customer.name ?? appointment.lead?.name,
        title: appointment.title,
        startsAt: appointment.startsAt,
        reminderName: window.name
      });

      const outgoing = await sendWhatsAppText({
        phoneNumberId: appointment.organization.whatsappPhoneNumberId ?? "local-phone-number-id",
        to: appointment.customer.phone,
        body
      });

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { [window.sentField]: now }
      });

      await prisma.notification.create({
        data: {
          organizationId: appointment.organizationId,
          type: NotificationType.APPOINTMENT,
          title: `${window.name} appointment reminder sent`,
          body: `${appointment.title} reminder sent to ${appointment.customer.phone}`,
          metadata: {
            appointmentId: appointment.id,
            providerMessageId: outgoing.providerMessageId,
            mocked: outgoing.mocked
          }
        }
      });

      results.push({
        appointmentId: appointment.id,
        reminder: window.name,
        providerMessageId: outgoing.providerMessageId
      });
    }
  }

  return results;
}

function buildReminderBody(input: {
  organizationName: string;
  customerName?: string | null;
  title: string;
  startsAt: Date;
  reminderName: string;
}) {
  const name = input.customerName ? ` ${input.customerName}` : "";
  return `Hello${name}, this is a ${input.reminderName} reminder for ${input.title} with ${input.organizationName} at ${input.startsAt.toLocaleString("en-AE", { timeZone: "Asia/Dubai" })}.`;
}
