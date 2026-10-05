-- Entidad de salud (Fonasa, Isapre, OSDE, Sancor, EPS...) junto al tipo de cobertura
ALTER TABLE "Patient" ADD COLUMN "coverageEntity" TEXT NOT NULL DEFAULT '';
