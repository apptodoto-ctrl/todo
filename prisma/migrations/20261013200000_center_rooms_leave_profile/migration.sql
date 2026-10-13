-- Salas, licencias, perfil profesional y aprobación de informes (Centro, paso 8)
ALTER TABLE "CenterMember" ADD COLUMN IF NOT EXISTS "pausedUntil" TIMESTAMP(3);
ALTER TABLE "CenterMember" ADD COLUMN IF NOT EXISTS "pausedReason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CenterMember" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CenterMember" ADD COLUMN IF NOT EXISTS "registryId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CenterMember" ADD COLUMN IF NOT EXISTS "specialty" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CenterMember" ADD COLUMN IF NOT EXISTS "signatureUrl" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "roomId" TEXT;

ALTER TABLE "GeneratedReport" ADD COLUMN IF NOT EXISTS "reviewState" TEXT NOT NULL DEFAULT 'borrador';
ALTER TABLE "GeneratedReport" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "GeneratedReport" ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT NOT NULL DEFAULT '';

CREATE TABLE "CenterRoom" (
  "id" TEXT NOT NULL,
  "centerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CenterRoom_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CenterRoom_centerId_active_idx" ON "CenterRoom"("centerId", "active");
ALTER TABLE "CenterRoom" ADD CONSTRAINT "CenterRoom_centerId_fkey"
  FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
