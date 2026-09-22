-- Correo del tutor/apoderado para las notificaciones de citas
ALTER TABLE "Patient" ADD COLUMN "guardianEmail" TEXT NOT NULL DEFAULT '';

-- Aviso al crear la cita y series de sesiones recurrentes
ALTER TABLE "Appointment" ADD COLUMN "createdNotifSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "seriesId" TEXT NOT NULL DEFAULT '';

-- Documentos asociados a un paciente
ALTER TABLE "Document" ADD COLUMN "patientId" INTEGER;
CREATE INDEX "Document_patientId_idx" ON "Document"("patientId");
ALTER TABLE "Document" ADD CONSTRAINT "Document_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
