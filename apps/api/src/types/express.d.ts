import type { UserRole } from "@dubai-ai/db";

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      auth?: {
        userId: string;
        organizationId: string;
        role: UserRole;
        email: string;
      };
      tenantId?: string;
    }
  }
}

export {};
