import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, SubscriptionStatus, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      name: "Free Trial",
      slug: "free-trial",
      stripePriceId: "price_free_trial_mock",
      description: "14-day trial to validate WhatsApp automation.",
      monthlyPriceAED: 0,
      messageLimit: 500,
      seatLimit: 1,
      knowledgeDocumentLimit: 5,
      features: ["whatsapp_inbox", "lead_capture", "basic_knowledge_base"]
    },
    {
      name: "Starter",
      slug: "starter",
      stripePriceId: "price_starter_mock",
      description: "For small teams validating WhatsApp automation.",
      monthlyPriceAED: 299,
      messageLimit: 3000,
      seatLimit: 3,
      knowledgeDocumentLimit: 50,
      features: ["whatsapp_inbox", "lead_capture", "basic_knowledge_base", "basic_analytics"]
    },
    {
      name: "Professional",
      slug: "professional",
      stripePriceId: "price_professional_mock",
      description: "For SMEs scaling customer support and sales operations.",
      monthlyPriceAED: 699,
      messageLimit: 15000,
      seatLimit: 10,
      knowledgeDocumentLimit: 250,
      features: ["whatsapp_inbox", "lead_scoring", "appointments", "analytics", "sales_agent"]
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      stripePriceId: "price_enterprise_mock",
      description: "For high-volume teams with advanced automation needs.",
      monthlyPriceAED: 1499,
      messageLimit: 50000,
      seatLimit: 30,
      knowledgeDocumentLimit: 1000,
      features: ["advanced_ai", "integrations", "priority_support", "audit_logs", "custom_rag"]
    }
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan
    });
  }

  const starter = await prisma.plan.findUniqueOrThrow({
    where: { slug: "professional" }
  });

  const organization = await prisma.organization.upsert({
    where: { slug: "demo-sme-llc" },
    update: {
      name: "Demo SME LLC",
      phone: "+971501112233",
      whatsappPhoneNumberId: "demo-phone-number-id",
      whatsappBusinessAccountId: "demo-waba-id",
      country: "AE",
      timezone: "Asia/Dubai"
    },
    create: {
      name: "Demo SME LLC",
      slug: "demo-sme-llc",
      phone: "+971501112233",
      whatsappPhoneNumberId: "demo-phone-number-id",
      whatsappBusinessAccountId: "demo-waba-id",
      country: "AE",
      timezone: "Asia/Dubai"
    }
  });

  const passwordHash = await bcrypt.hash("DemoPass123!", 12);

  const users = [
    {
      email: "admin@demo.ae",
      name: "Demo Admin",
      role: UserRole.ADMIN
    },
    {
      email: "manager@demo.ae",
      name: "Demo Manager",
      role: UserRole.MANAGER
    },
    {
      email: "support@demo.ae",
      name: "Demo Support",
      role: UserRole.SUPPORT_AGENT
    }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
        organizationId: organization.id,
        isActive: true
      },
      create: {
        ...user,
        passwordHash,
        organizationId: organization.id,
        isActive: true
      }
    });
  }

  await prisma.subscription.upsert({
    where: { organizationId: organization.id },
    update: {
      planId: starter.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    create: {
      organizationId: organization.id,
      planId: starter.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  for (const dayOfWeek of [1, 2, 3, 4, 5]) {
    const existingHours = await prisma.businessHour.findFirst({
      where: { organizationId: organization.id, userId: null, dayOfWeek }
    });

    const data = {
      opensAt: "09:00",
      closesAt: "17:00",
      slotMinutes: 30,
      timezone: "Asia/Dubai",
      isActive: true
    };

    if (existingHours) {
      await prisma.businessHour.update({
        where: { id: existingHours.id },
        data
      });
    } else {
      await prisma.businessHour.create({
        data: {
          ...data,
          organizationId: organization.id,
          dayOfWeek
        }
      });
    }
  }

  console.log("Seed completed: demo plans, organization, and admin users are ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
