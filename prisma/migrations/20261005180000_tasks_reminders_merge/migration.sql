-- Unificación de Tareas y Recordatorios (N3)
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "time" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "notify" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "notifiedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Task_notify_notifiedAt_idx" ON "Task"("notify", "notifiedAt");

-- Los recordatorios existentes pasan a ser tareas con aviso por correo
INSERT INTO "Task" ("title", "description", "priority", "status", "due", "time", "notify", "notifiedAt", "category", "patientName", "createdBy", "createdAt", "updatedAt")
SELECT
  r."title",
  r."description",
  'media',
  CASE WHEN r."done" THEN 'completada' ELSE 'pendiente' END,
  r."date",
  r."time",
  true,
  NOW(), -- ya existían: no deben disparar un correo al desplegar
  CASE r."type"
    WHEN 'cita' THEN 'Cita'
    WHEN 'pago' THEN 'Pago'
    WHEN 'tarea' THEN 'Clínico'
    ELSE 'Recordatorio'
  END,
  '',
  r."createdBy",
  r."createdAt",
  r."updatedAt"
FROM "Reminder" r;
