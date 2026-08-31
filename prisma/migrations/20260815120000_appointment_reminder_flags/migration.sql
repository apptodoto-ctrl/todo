-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "reminder5dSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reminder1dSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reminder4hSent" BOOLEAN NOT NULL DEFAULT false;
