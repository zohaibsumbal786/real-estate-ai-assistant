-- Add missing indexes for performance optimization

-- Message direction index for filtering by direction
CREATE INDEX "Message_organizationId_direction_idx" ON "Message"("organizationId", "direction");

-- Message sentAt index for time-based queries
CREATE INDEX "Message_organizationId_direction_sentAt_idx" ON "Message"("organizationId", "direction", "sentAt");

-- Lead score index for sorting
CREATE INDEX "Lead_organizationId_score_idx" ON "Lead"("organizationId", "score" DESC);

-- Lead assignee index for agent workload queries
CREATE INDEX "Lead_organizationId_assignedToId_idx" ON "Lead"("organizationId", "assignedToId");

-- Conversation updated at for sorting and filtering
CREATE INDEX "Conversation_organizationId_updatedAt_idx" ON "Conversation"("organizationId", "updatedAt" DESC);

-- Conversation status with updated at for dashboard queries
CREATE INDEX "Conversation_organizationId_status_updatedAt_idx" ON "Conversation"("organizationId", "status", "updatedAt" DESC);

-- RefreshToken expiresAt for cleanup jobs
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- RefreshToken revoked at for filtering active tokens
CREATE INDEX "RefreshToken_organizationId_revokedAt_idx" ON "RefreshToken"("organizationId", "revokedAt");

-- Customer whatsappId for quick lookups
CREATE INDEX "Customer_organizationId_whatsappId_idx" ON "Customer"("organizationId", "whatsappId");

-- Notification createdAt for sorting
CREATE INDEX "Notification_organizationId_createdAt_idx" ON "Notification"("organizationId", "createdAt" DESC);

-- Notification userId status for user-specific queries
CREATE INDEX "Notification_userId_status_idx" ON "Notification"("userId", "status");

-- KnowledgeDocument updated at for listing
CREATE INDEX "KnowledgeDocument_organizationId_updatedAt_idx" ON "KnowledgeDocument"("organizationId", "updatedAt" DESC);

-- KnowledgeChunk documentId for chunk retrieval
CREATE INDEX "KnowledgeChunk_documentId_chunkIndex_idx" ON "KnowledgeChunk"("documentId", "chunkIndex");

-- Subscription status for subscription lifecycle queries
CREATE INDEX "Subscription_organizationId_status_updatedAt_idx" ON "Subscription"("organizationId", "status", "updatedAt" DESC);

-- User organization role for admin queries
CREATE INDEX "User_organizationId_role_idx" ON "User"("organizationId", "role");

-- User isActive for filtering
CREATE INDEX "User_organizationId_isActive_idx" ON "User"("organizationId", "isActive");

-- Customer phone for deduplication checks
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- Lead phone for deduplication checks
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- Appointment user for calendar queries
CREATE INDEX "Appointment_organizationId_userId_status_idx" ON "Appointment"("organizationId", "userId", "status");

-- Message customer for message history by customer
CREATE INDEX "Message_organizationId_customerId_sentAt_idx" ON "Message"("organizationId", "customerId", "sentAt" DESC);
