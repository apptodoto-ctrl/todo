-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "createdBy" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Pipeline" ADD COLUMN     "createdBy" TEXT NOT NULL DEFAULT '';
