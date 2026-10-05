-- Paquetes de sesiones (F2)
CREATE TABLE "SessionPackage" (
  "id" SERIAL NOT NULL,
  "patientId" INTEGER NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "totalSessions" INTEGER NOT NULL,
  "sessionValue" INTEGER NOT NULL DEFAULT 0,
  "totalPrice" INTEGER NOT NULL DEFAULT 0,
  "paid" BOOLEAN NOT NULL DEFAULT false,
  "startDate" TEXT NOT NULL DEFAULT '',
  "expiresAt" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'activo',
  "createdBy" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SessionPackage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SessionPackage_createdBy_status_idx" ON "SessionPackage"("createdBy", "status");
CREATE INDEX "SessionPackage_patientId_idx" ON "SessionPackage"("patientId");

ALTER TABLE "SessionPackage" ADD CONSTRAINT "SessionPackage_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionRecord" ADD COLUMN IF NOT EXISTS "packageId" INTEGER;
CREATE INDEX IF NOT EXISTS "SessionRecord_packageId_idx" ON "SessionRecord"("packageId");
ALTER TABLE "SessionRecord" ADD CONSTRAINT "SessionRecord_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "SessionPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
