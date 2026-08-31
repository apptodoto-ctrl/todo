-- CreateTable PlanTier
CREATE TABLE "PlanTier" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "maxPatients" INTEGER,
    "therapists" INTEGER NOT NULL DEFAULT 1,
    "aiCredits" INTEGER NOT NULL DEFAULT 0,
    "priceMonthly" INTEGER NOT NULL,
    "priceYearly" INTEGER NOT NULL,
    "isAddon" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanTier_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlanTier_code_key" ON "PlanTier"("code");

-- CreateTable AiFeature
CREATE TABLE "AiFeature" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "creditCost" INTEGER NOT NULL,
    "esencial" BOOLEAN NOT NULL DEFAULT false,
    "profesional" BOOLEAN NOT NULL DEFAULT true,
    "centro" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiFeature_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AiFeature_key_key" ON "AiFeature"("key");

-- CreateTable CreditPack
CREATE TABLE "CreditPack" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CreditPack_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CreditPack_code_key" ON "CreditPack"("code");

-- CreateTable Coupon
CREATE TABLE "Coupon" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "maxRedemptions" INTEGER,
    "redemptions" INTEGER NOT NULL DEFAULT 0,
    "validUntil" TIMESTAMP(3),
    "planRestriction" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateTable PricingSetting
CREATE TABLE "PricingSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PricingSetting_pkey" PRIMARY KEY ("key")
);

-- Seed: escalones (valores del documento de pricing)
INSERT INTO "PlanTier" ("code","plan","maxPatients","therapists","aiCredits","priceMonthly","priceYearly","isAddon","notes","sortOrder","updatedAt") VALUES
('esencial_10','Esencial',10,1,30,17,170,false,'Créditos solo para ideas de actividades',1,CURRENT_TIMESTAMP),
('esencial_20','Esencial',20,1,50,27,270,false,'Créditos solo para ideas de actividades',2,CURRENT_TIMESTAMP),
('profesional_20','Profesional',20,1,120,37,370,false,'',3,CURRENT_TIMESTAMP),
('profesional_30','Profesional',30,1,180,47,470,false,'',4,CURRENT_TIMESTAMP),
('profesional_max','Profesional',NULL,1,300,67,670,false,'Sin tope de pacientes',5,CURRENT_TIMESTAMP),
('centro_5','Centro',NULL,5,800,97,970,false,'Créditos compartidos entre el equipo',6,CURRENT_TIMESTAMP),
('centro_extra','Centro',NULL,1,150,15,150,true,'Aditivo: cada terapeuta extra suma $15 y 150 créditos al pozo común',7,CURRENT_TIMESTAMP);

-- Seed: funciones de IA
INSERT INTO "AiFeature" ("key","name","creditCost","esencial","profesional","centro","updatedAt") VALUES
('ai_ideas_actividades','Ideas para actividades',1,true,true,true,CURRENT_TIMESTAMP),
('ai_cuento','Cuento terapéutico',2,false,true,true,CURRENT_TIMESTAMP),
('ai_informe','Informe con IA',5,false,true,true,CURRENT_TIMESTAMP);

-- Seed: recargas de créditos
INSERT INTO "CreditPack" ("code","credits","price","sortOrder","updatedAt") VALUES
('credits_50',50,4,1,CURRENT_TIMESTAMP),
('credits_150',150,10,2,CURRENT_TIMESTAMP),
('credits_400',400,25,3,CURRENT_TIMESTAMP);

-- Seed: cupón FUNDADORA
INSERT INTO "Coupon" ("code","type","value","maxRedemptions","planRestriction","description","updatedAt") VALUES
('FUNDADORA','fixed',27,50,'profesional_30','profesional_30 a $27/mes vitalicio mientras siga activa. Precio congelado y distintivo permanente.',CURRENT_TIMESTAMP);

-- Seed: configuración del trial y reglas generales
INSERT INTO "PricingSetting" ("key","value","label","updatedAt") VALUES
('trial_days','7','Duración de la prueba gratis (días)',CURRENT_TIMESTAMP),
('trial_tier','profesional_30','Escalón que se usa durante la prueba',CURRENT_TIMESTAMP),
('trial_credits','40','Créditos de IA durante la prueba',CURRENT_TIMESTAMP),
('trial_max_patients','10','Máximo de pacientes durante la prueba',CURRENT_TIMESTAMP),
('trial_requires_card','no','¿Se pide tarjeta para la prueba? (si/no)',CURRENT_TIMESTAMP),
('trial_per_email','1','Pruebas permitidas por correo verificado',CURRENT_TIMESTAMP),
('annual_months_charged','10','Meses que se cobran en el plan anual (se usan 12)',CURRENT_TIMESTAMP),
('credits_warning_pct','80','% de uso de créditos que dispara el aviso en la app',CURRENT_TIMESTAMP),
('payment_retry_days','1,3,7','Días de reintento tras pago rechazado',CURRENT_TIMESTAMP),
('grace_days','7','Días de gracia con acceso normal tras los reintentos',CURRENT_TIMESTAMP),
('readonly_days','90','Días en solo lectura antes de cualquier otra medida',CURRENT_TIMESTAMP);
