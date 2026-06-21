import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@dubai-ai/db";
import { createApp } from "./app.js";

const app = createApp();

describe("auth and tenant enforcement", () => {
  const unique = Date.now();
  const email = `owner-${unique}@example.ae`;
  let accessToken = "";
  let refreshToken = "";

  beforeAll(async () => {
    await prisma.plan.upsert({
      where: { slug: "starter" },
      update: {},
      create: {
        name: "Starter",
        slug: "starter",
        monthlyPriceAED: 299,
        messageLimit: 3000,
        seatLimit: 3,
        knowledgeDocumentLimit: 50,
        features: ["whatsapp_inbox"]
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("registers an organization and returns JWTs", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        organizationName: `Tenant ${unique}`,
        name: "Owner User",
        email,
        password: "StrongPass123!"
      })
      .expect(201);

    expect(response.body.organization.id).toBeTruthy();
    expect(response.body.user.organizationId).toBe(response.body.organization.id);
    expect(response.body.tokens.accessToken).toBeTruthy();
    expect(response.body.tokens.refreshToken).toBeTruthy();

    accessToken = response.body.tokens.accessToken;
    refreshToken = response.body.tokens.refreshToken;
  });

  it("uses the JWT organization as the tenant source", async () => {
    const createResponse = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-organization-id", "malicious-tenant")
      .send({
        phone: `+97150${unique.toString().slice(-7)}`,
        name: "Tenant Contact"
      })
      .expect(201);

    const meResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(createResponse.body.organizationId).toBe(meResponse.body.organization.id);
  });

  it("rotates refresh tokens", async () => {
    const response = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken })
      .expect(200);

    expect(response.body.tokens.accessToken).toBeTruthy();
    expect(response.body.tokens.refreshToken).toBeTruthy();
    expect(response.body.tokens.refreshToken).not.toBe(refreshToken);
  });

  it("logs in with bcrypt-backed credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "StrongPass123!" })
      .expect(200);

    expect(response.body.tokens.accessToken).toBeTruthy();
    expect(response.body.user.email).toBe(email);
  });
});
