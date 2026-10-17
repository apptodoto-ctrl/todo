-- Vuelven los índices que la migración anterior borró por no estar declarados en el esquema
CREATE INDEX IF NOT EXISTS "Appointment_centerId_idx" ON "Appointment"("centerId");
CREATE INDEX IF NOT EXISTS "Document_centerId_idx" ON "Document"("centerId");
CREATE INDEX IF NOT EXISTS "FormTemplate_centerId_idx" ON "FormTemplate"("centerId");
CREATE INDEX IF NOT EXISTS "GeneratedReport_centerId_idx" ON "GeneratedReport"("centerId");
CREATE INDEX IF NOT EXISTS "Patient_centerId_idx" ON "Patient"("centerId");
CREATE INDEX IF NOT EXISTS "Pipeline_centerId_idx" ON "Pipeline"("centerId");
CREATE INDEX IF NOT EXISTS "Reminder_centerId_idx" ON "Reminder"("centerId");
CREATE INDEX IF NOT EXISTS "SessionPackage_centerId_idx" ON "SessionPackage"("centerId");
CREATE INDEX IF NOT EXISTS "SessionRecord_packageId_idx" ON "SessionRecord"("packageId");
CREATE INDEX IF NOT EXISTS "Task_assignedTo_idx" ON "Task"("assignedTo");
CREATE INDEX IF NOT EXISTS "Task_centerId_idx" ON "Task"("centerId");
