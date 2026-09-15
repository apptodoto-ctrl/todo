-- Moneda de la cuenta (CLP / ARS / USD) para los montos clínicos
ALTER TABLE "User" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'CLP';

-- Hora de la próxima sesión del paciente
ALTER TABLE "Patient" ADD COLUMN "nextSessionTime" TEXT NOT NULL DEFAULT '';
