-- DropIndex
DROP INDEX "Appointment_centerId_idx";

-- DropIndex
DROP INDEX "Document_centerId_idx";

-- DropIndex
DROP INDEX "FormTemplate_centerId_idx";

-- DropIndex
DROP INDEX "GeneratedReport_centerId_idx";

-- DropIndex
DROP INDEX "Patient_centerId_idx";

-- DropIndex
DROP INDEX "Pipeline_centerId_idx";

-- DropIndex
DROP INDEX "Reminder_centerId_idx";

-- DropIndex
DROP INDEX "SessionPackage_centerId_idx";

-- DropIndex
DROP INDEX "SessionRecord_packageId_idx";

-- DropIndex
DROP INDEX "Task_assignedTo_idx";

-- DropIndex
DROP INDEX "Task_centerId_idx";

-- AlterTable
ALTER TABLE "Center" ADD COLUMN     "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "CenterMember" ADD COLUMN     "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "CenterExpense" (
    "id" SERIAL NOT NULL,
    "centerId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'otro',
    "description" TEXT NOT NULL DEFAULT '',
    "amount" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CenterExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CenterExpense_centerId_month_idx" ON "CenterExpense"("centerId", "month");

-- AddForeignKey
ALTER TABLE "CenterExpense" ADD CONSTRAINT "CenterExpense_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
