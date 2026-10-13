-- Notas internas del equipo sobre un paciente (Centro, paso 5)
CREATE TABLE "InternalNote" (
  "id" SERIAL NOT NULL,
  "patientId" INTEGER NOT NULL,
  "centerId" TEXT,
  "body" TEXT NOT NULL,
  "authorName" TEXT NOT NULL DEFAULT '',
  "createdBy" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InternalNote_patientId_idx" ON "InternalNote"("patientId");
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
