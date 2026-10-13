-- Panel del equipo TOdo: situaciones de cuenta, auditoría, interruptores y consultas
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "accountState" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stateReason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stateChangedAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "betaGroup" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "betaUntil" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "tags" JSONB;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);

CREATE TABLE "AdminAuditLog" (
  "id" SERIAL NOT NULL,
  "actor" TEXT NOT NULL,
  "targetEmail" TEXT NOT NULL DEFAULT '',
  "action" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "reason" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminAuditLog_targetEmail_createdAt_idx" ON "AdminAuditLog"("targetEmail", "createdAt");
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

CREATE TABLE "FeatureFlag" (
  "id" SERIAL NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "audience" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

CREATE TABLE "SupportTicket" (
  "id" SERIAL NOT NULL,
  "userEmail" TEXT NOT NULL,
  "userName" TEXT NOT NULL DEFAULT '',
  "screen" TEXT NOT NULL DEFAULT '',
  "message" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'nueva',
  "reply" TEXT NOT NULL DEFAULT '',
  "repliedBy" TEXT NOT NULL DEFAULT '',
  "repliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupportTicket_state_createdAt_idx" ON "SupportTicket"("state", "createdAt");
CREATE INDEX "SupportTicket_userEmail_idx" ON "SupportTicket"("userEmail");

-- Las cuentas que ya existen heredan su situación desde el estado actual
UPDATE "Subscription" SET "accountState" = CASE "status"
  WHEN 'trialing' THEN 'trial'
  WHEN 'active' THEN 'active'
  WHEN 'past_due' THEN 'past_due'
  WHEN 'comp' THEN 'comp'
  WHEN 'canceled' THEN 'cancelada'
  ELSE "status"
END WHERE "accountState" = '';
