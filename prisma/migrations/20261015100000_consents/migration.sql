-- Documentos que la familia lee y acepta en línea (complemento feedback 2, N1)
CREATE TABLE "ConsentTemplate" (
  "id" SERIAL NOT NULL,
  "centerId" TEXT,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'otro',
  "body" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConsentTemplate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ConsentTemplate_createdBy_active_idx" ON "ConsentTemplate"("createdBy", "active");
ALTER TABLE "ConsentTemplate" ADD CONSTRAINT "ConsentTemplate_centerId_fkey"
  FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ConsentRequest" (
  "id" SERIAL NOT NULL,
  "centerId" TEXT,
  "templateId" INTEGER NOT NULL,
  "patientId" INTEGER NOT NULL,
  "token" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "sentTo" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "acceptedName" TEXT NOT NULL DEFAULT '',
  "acceptedEmail" TEXT NOT NULL DEFAULT '',
  "documentId" INTEGER,
  "createdBy" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConsentRequest_token_key" ON "ConsentRequest"("token");
CREATE INDEX "ConsentRequest_patientId_idx" ON "ConsentRequest"("patientId");
CREATE INDEX "ConsentRequest_createdBy_acceptedAt_idx" ON "ConsentRequest"("createdBy", "acceptedAt");
ALTER TABLE "ConsentRequest" ADD CONSTRAINT "ConsentRequest_centerId_fkey"
  FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsentRequest" ADD CONSTRAINT "ConsentRequest_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "ConsentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsentRequest" ADD CONSTRAINT "ConsentRequest_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
