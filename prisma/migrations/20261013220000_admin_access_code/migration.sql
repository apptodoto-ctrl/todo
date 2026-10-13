-- Código de verificación para entrar al panel del equipo TOdo
CREATE TABLE "AdminAccessCode" (
  "id" SERIAL NOT NULL,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAccessCode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminAccessCode_email_createdAt_idx" ON "AdminAccessCode"("email", "createdAt");
