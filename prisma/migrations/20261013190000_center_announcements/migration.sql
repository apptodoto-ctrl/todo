-- Avisos de la Administradora al equipo (Centro, paso 7)
CREATE TABLE "CenterAnnouncement" (
  "id" TEXT NOT NULL,
  "centerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL DEFAULT '',
  "audience" JSONB,
  "authorName" TEXT NOT NULL DEFAULT '',
  "createdBy" TEXT NOT NULL DEFAULT '',
  "readBy" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CenterAnnouncement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CenterAnnouncement_centerId_createdAt_idx" ON "CenterAnnouncement"("centerId", "createdAt");
ALTER TABLE "CenterAnnouncement" ADD CONSTRAINT "CenterAnnouncement_centerId_fkey"
  FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
