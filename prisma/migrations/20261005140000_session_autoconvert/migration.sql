-- Pago anticipado y marca de conversión en las citas del calendario
ALTER TABLE "Appointment" ADD COLUMN "paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "convertedToSession" BOOLEAN NOT NULL DEFAULT false;

-- Sesiones creadas automáticamente desde el calendario: quedan por confirmar
ALTER TABLE "SessionRecord" ADD COLUMN "confirmed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "appointmentId" INTEGER;
CREATE UNIQUE INDEX "SessionRecord_appointmentId_key" ON "SessionRecord"("appointmentId");
