-- Suscripción del calendario desde Google Calendar u otra agenda (C3)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "calendarToken" TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS "User_calendarToken_idx" ON "User"("calendarToken");
