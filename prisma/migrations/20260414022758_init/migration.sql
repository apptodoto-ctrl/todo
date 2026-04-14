-- CreateTable
CREATE TABLE "Patient" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "therapist" TEXT NOT NULL DEFAULT 'Josefina P.',
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "nextSession" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'activo',
    "initials" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'from-violet-500 to-purple-600',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'media',
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "due" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'Clínico',
    "patientName" TEXT NOT NULL DEFAULT '',
    "patientId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'sesion',
    "location" TEXT NOT NULL DEFAULT 'Sala 1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineColumn" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "accent" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PipelineColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineCase" (
    "id" SERIAL NOT NULL,
    "patient" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "therapist" TEXT NOT NULL DEFAULT 'JP',
    "days" INTEGER NOT NULL DEFAULT 0,
    "overdue" BOOLEAN NOT NULL DEFAULT false,
    "initials" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "patientId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PipelineCase_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineCase" ADD CONSTRAINT "PipelineCase_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "PipelineColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineCase" ADD CONSTRAINT "PipelineCase_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
