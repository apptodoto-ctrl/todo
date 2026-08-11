-- AlterTable Patient
ALTER TABLE "Patient" ADD COLUMN "birthDate" TEXT NOT NULL DEFAULT '',
ADD COLUMN "guardian" TEXT NOT NULL DEFAULT '',
ADD COLUMN "guardianPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN "prevision" TEXT NOT NULL DEFAULT '',
ADD COLUMN "school" TEXT NOT NULL DEFAULT '',
ADD COLUMN "consultReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN "sessionValue" INTEGER NOT NULL DEFAULT 0;

-- AlterTable SessionRecord
ALTER TABLE "SessionRecord" ADD COLUMN "duration" INTEGER NOT NULL DEFAULT 45,
ADD COLUMN "attended" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "paid" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Appointment
ALTER TABLE "Appointment" ADD COLUMN "patientId" INTEGER,
ADD COLUMN "duration" INTEGER NOT NULL DEFAULT 45,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'agendada';

-- CreateTable Objective
CREATE TABLE "Objective" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Objective_pkey" PRIMARY KEY ("id")
);

-- CreateTable GeneratedReport
CREATE TABLE "GeneratedReport" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'informe',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Objective_patientId_idx" ON "Objective"("patientId");
CREATE INDEX "GeneratedReport_createdBy_idx" ON "GeneratedReport"("createdBy");

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedReport" ADD CONSTRAINT "GeneratedReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
