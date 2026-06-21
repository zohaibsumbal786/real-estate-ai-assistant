import bcrypt from "bcryptjs";
import { Prisma, prisma, SubscriptionStatus, UserRole } from "@dubai-ai/db";
import { config } from "../config.js";
import { HttpError } from "../lib/http-error.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt.js";
import { hashRefreshToken } from "../lib/refresh-token.js";
import { slugify } from "../lib/slug.js";

type TokenUser = {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
};

function refreshTokenExpiry() {
  const match = config.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)([dhm])$/);
  const amount = match ? Number(match[1]) : 7;
  const unit = match?.[2] ?? "d";
  const ms =
    unit === "m"
      ? amount * 60 * 1000
      : unit === "h"
        ? amount * 60 * 60 * 1000
        : amount * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}

async function createTokenPair(user: TokenUser) {
  const accessToken = signAccessToken({
    sub: user.id,
    organizationId: user.organizationId,
    role: user.role,
    email: user.email
  });
  const refreshToken = signRefreshToken({
    sub: user.id,
    organizationId: user.organizationId
  });

  await prisma.refreshToken.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiry()
    }
  });

  return { accessToken, refreshToken };
}

export async function registerOrganization(input: {
  organizationName: string;
  name: string;
  email: string;
  password: string;
}) {
  const email = input.email.toLowerCase().trim();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new HttpError(409, "A user with this email already exists", "EMAIL_EXISTS");
  }

  const baseSlug = slugify(input.organizationName);
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
  const passwordHash = await bcrypt.hash(input.password, 12);
  
  // Try to find the free-trial plan, but don't fail if it doesn't exist
  let starterPlan = null;
  try {
    starterPlan = await prisma.plan.findUnique({ where: { slug: "free-trial" } });
  } catch (error) {
    console.warn("[Auth] Free-trial plan not found, creating organization without subscription");
  }

  const { user, organization } = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.organizationName,
        slug,
        country: "AE",
        timezone: "Asia/Dubai"
      }
    });

    const user = await tx.user.create({
      data: {
        organizationId: organization.id,
        email,
        name: input.name,
        passwordHash,
        role: UserRole.ADMIN
      }
    });

    if (starterPlan) {
      try {
        await tx.subscription.create({
          data: {
            organizationId: organization.id,
            planId: starterPlan.id,
            status: SubscriptionStatus.TRIALING,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          }
        });
      } catch (error) {
        console.warn("[Auth] Failed to create trial subscription:", error);
      }
    }

    return { user, organization };
  });

  const tokens = await createTokenPair(user);
  return { organization, user: sanitizeUser(user), tokens };
}

export async function login(input: { email: string; password: string }) {
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: true }
  });

  if (!user || !user.isActive || !user.organization.isActive) {
    throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValid) {
    throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  const tokens = await createTokenPair(user);
  return {
    organization: user.organization,
    user: sanitizeUser(user),
    tokens
  };
}

export async function rotateRefreshToken(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, "Invalid refresh token", "REFRESH_INVALID");
  }

  const tokenHash = hashRefreshToken(refreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (
    !storedToken ||
    storedToken.revokedAt ||
    storedToken.expiresAt <= new Date() ||
    storedToken.userId !== payload.sub ||
    storedToken.organizationId !== payload.organizationId
  ) {
    throw new HttpError(401, "Refresh token is no longer valid", "REFRESH_REVOKED");
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() }
  });

  const tokens = await createTokenPair(storedToken.user);
  return {
    user: sanitizeUser(storedToken.user),
    tokens
  };
}

export async function getAuthenticatedProfile(userId: string, organizationId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    include: {
      organization: true
    }
  });

  if (!user) {
    throw new HttpError(404, "Authenticated user not found", "USER_NOT_FOUND");
  }

  return {
    organization: user.organization,
    user: sanitizeUser(user)
  };
}

export async function changePassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId }
  });

  if (!user) {
    throw new HttpError(404, "User not found", "USER_NOT_FOUND");
  }

  // Verify current password
  const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!isValid) {
    throw new HttpError(401, "Current password is incorrect", "INVALID_PASSWORD");
  }

  // Prevent using the same password
  const isSamePassword = await bcrypt.compare(input.newPassword, user.passwordHash);
  if (isSamePassword) {
    throw new HttpError(400, "New password must be different from current password", "SAME_PASSWORD");
  }

  // Hash and update new password
  const newPasswordHash = await bcrypt.hash(input.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newPasswordHash }
  });

  return sanitizeUser(user);
}

function sanitizeUser<T extends { passwordHash: string }>(user: T) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
