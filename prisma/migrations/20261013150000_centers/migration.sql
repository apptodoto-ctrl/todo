-- Cuenta Centro: la organización, su equipo y la pertenencia de los datos
CREATE TABLE "Center" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "logoUrl" TEXT NOT NULL DEFAULT '',
  "address" TEXT NOT NULL DEFAULT '',
  "taxId" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "attendanceMode" TEXT NOT NULL DEFAULT 'ambos',
  "country" TEXT NOT NULL DEFAULT 'CL',
  "currency" TEXT NOT NULL DEFAULT 'CLP',
  "seats" INTEGER NOT NULL DEFAULT 5,
  "extraSeats" INTEGER NOT NULL DEFAULT 0,
  "adminEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Center_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Center_adminEmail_idx" ON "Center"("adminEmail");

CREATE TABLE "CenterMember" (
  "id" TEXT NOT NULL,
  "centerId" TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "role" TEXT NOT NULL DEFAULT 'terapeuta',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "permissions" JSONB NOT NULL,
  "inviteToken" TEXT,
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "joinedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CenterMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CenterMember_inviteToken_key" ON "CenterMember"("inviteToken");
CREATE UNIQUE INDEX "CenterMember_centerId_userEmail_key" ON "CenterMember"("centerId", "userEmail");
CREATE INDEX "CenterMember_userEmail_active_idx" ON "CenterMember"("userEmail", "active");
ALTER TABLE "CenterMember" ADD CONSTRAINT "CenterMember_centerId_fkey"
  FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- La información pasa a poder pertenecer a un Centro. NULL = cuenta individual,
-- que es como siguen funcionando todas las cuentas que ya existen.
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "centerId" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "therapistEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "attendanceMode" TEXT NOT NULL DEFAULT 'centro';
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "homeAddress" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "centerId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "centerId" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "centerId" TEXT;
ALTER TABLE "GeneratedReport" ADD COLUMN IF NOT EXISTS "centerId" TEXT;
ALTER TABLE "SessionPackage" ADD COLUMN IF NOT EXISTS "centerId" TEXT;
ALTER TABLE "FormTemplate" ADD COLUMN IF NOT EXISTS "centerId" TEXT;
ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "centerId" TEXT;
ALTER TABLE "Pipeline" ADD COLUMN IF NOT EXISTS "centerId" TEXT;

-- La terapeuta a cargo arranca siendo quien creó cada ficha
UPDATE "Patient" SET "therapistEmail" = "createdBy" WHERE "therapistEmail" = '';

CREATE INDEX IF NOT EXISTS "Patient_centerId_idx" ON "Patient"("centerId");
CREATE INDEX IF NOT EXISTS "Appointment_centerId_idx" ON "Appointment"("centerId");
CREATE INDEX IF NOT EXISTS "Task_centerId_idx" ON "Task"("centerId");
CREATE INDEX IF NOT EXISTS "Document_centerId_idx" ON "Document"("centerId");
CREATE INDEX IF NOT EXISTS "GeneratedReport_centerId_idx" ON "GeneratedReport"("centerId");
CREATE INDEX IF NOT EXISTS "SessionPackage_centerId_idx" ON "SessionPackage"("centerId");
CREATE INDEX IF NOT EXISTS "FormTemplate_centerId_idx" ON "FormTemplate"("centerId");
CREATE INDEX IF NOT EXISTS "Reminder_centerId_idx" ON "Reminder"("centerId");
CREATE INDEX IF NOT EXISTS "Pipeline_centerId_idx" ON "Pipeline"("centerId");

ALTER TABLE "Patient" ADD CONSTRAINT "Patient_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedReport" ADD CONSTRAINT "GeneratedReport_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionPackage" ADD CONSTRAINT "SessionPackage_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
