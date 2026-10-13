-- Horario de atención, tareas asignadas y autoría de la cita (Centro, paso 4)
ALTER TABLE "CenterMember" ADD COLUMN IF NOT EXISTS "schedule" JSONB;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "assignedTo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "comment" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "scheduledBy" TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS "Task_assignedTo_idx" ON "Task"("assignedTo");
