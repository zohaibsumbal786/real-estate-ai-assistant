-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "aiConfidence" DOUBLE PRECISION,
ADD COLUMN     "aiLastIntent" TEXT,
ADD COLUMN     "aiPausedAt" TIMESTAMP(3),
ADD COLUMN     "language" TEXT,
ADD COLUMN     "needsHuman" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "whatsappBusinessAccountId" TEXT,
ADD COLUMN     "whatsappPhoneNumberId" TEXT;

-- CreateIndex
CREATE INDEX "Conversation_organizationId_needsHuman_idx" ON "Conversation"("organizationId", "needsHuman");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_whatsappPhoneNumberId_key" ON "Organization"("whatsappPhoneNumberId");

