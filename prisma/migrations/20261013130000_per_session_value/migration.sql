-- Valor propio por cita y por sesión; vacío = se usa el valor del usuario (A1)
ALTER TABLE "SessionRecord" ADD COLUMN IF NOT EXISTS "value" INTEGER;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "value" INTEGER;
