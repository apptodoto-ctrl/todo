-- País de la terapeuta: define moneda y formato del documento (A2)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'CL';

-- Las cuentas que ya existen heredan el país que corresponde a su moneda
UPDATE "User" SET "country" = CASE "currency"
  WHEN 'CLP' THEN 'CL'
  WHEN 'ARS' THEN 'AR'
  WHEN 'COP' THEN 'CO'
  ELSE 'OT'
END;
