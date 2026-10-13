-- Finanzas del Centro: pago a terapeutas, medio de pago y tipos de sesión (paso 6)
ALTER TABLE "CenterMember" ADD COLUMN IF NOT EXISTS "payMode" TEXT NOT NULL DEFAULT 'porcentaje';
ALTER TABLE "CenterMember" ADD COLUMN IF NOT EXISTS "payValue" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "SessionRecord" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SessionRecord" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "SessionRecord" ADD COLUMN IF NOT EXISTS "paidBy" TEXT NOT NULL DEFAULT '';

CREATE TABLE "CenterSessionType" (
  "id" TEXT NOT NULL,
  "centerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "duration" INTEGER NOT NULL DEFAULT 45,
  "value" INTEGER NOT NULL DEFAULT 0,
  "place" TEXT NOT NULL DEFAULT 'ambos',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CenterSessionType_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CenterSessionType_centerId_active_idx" ON "CenterSessionType"("centerId", "active");
ALTER TABLE "CenterSessionType" ADD CONSTRAINT "CenterSessionType_centerId_fkey"
  FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
