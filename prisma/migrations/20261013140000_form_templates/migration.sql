-- Plantillas propias de formularios y fichas llenadas (N1)
CREATE TABLE "FormTemplate" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "sections" JSONB NOT NULL,
  "origin" TEXT NOT NULL DEFAULT 'propia',
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "createdBy" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FormTemplate_createdBy_archived_idx" ON "FormTemplate"("createdBy", "archived");

CREATE TABLE "FormResponse" (
  "id" SERIAL NOT NULL,
  "templateId" INTEGER NOT NULL,
  "patientId" INTEGER NOT NULL,
  "title" TEXT NOT NULL DEFAULT '',
  "answers" JSONB NOT NULL,
  "createdBy" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FormResponse_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FormResponse_patientId_idx" ON "FormResponse"("patientId");
CREATE INDEX "FormResponse_templateId_idx" ON "FormResponse"("templateId");

ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "FormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
