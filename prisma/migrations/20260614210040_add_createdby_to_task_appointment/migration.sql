-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "createdBy" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "location" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "createdBy" TEXT NOT NULL DEFAULT '';
