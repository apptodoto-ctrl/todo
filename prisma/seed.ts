import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de base de datos...");

  // ─── LIMPIAR DATOS EXISTENTES ────────────────────────────────────────────────
  await prisma.pipelineCase.deleteMany();
  await prisma.pipelineColumn.deleteMany();
  await prisma.task.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();

  // ─── PACIENTES ───────────────────────────────────────────────────────────────
  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        name: "María García",
        age: 32,
        diagnosis: "Ansiedad generalizada",
        therapist: "Dra. López",
        sessions: 12,
        nextSession: "2025-07-15",
        status: "activo",
        initials: "MG",
        color: "#6366f1",
      },
    }),
    prisma.patient.create({
      data: {
        name: "Carlos Rodríguez",
        age: 45,
        diagnosis: "Depresión moderada",
        therapist: "Dr. Martínez",
        sessions: 8,
        nextSession: "2025-07-18",
        status: "activo",
        initials: "CR",
        color: "#8b5cf6",
      },
    }),
    prisma.patient.create({
      data: {
        name: "Ana Martínez",
        age: 28,
        diagnosis: "TDAH",
        therapist: "Dra. López",
        sessions: 20,
        nextSession: "2025-07-20",
        status: "activo",
        initials: "AM",
        color: "#ec4899",
      },
    }),
    prisma.patient.create({
      data: {
        name: "Luis Hernández",
        age: 51,
        diagnosis: "Trastorno bipolar",
        therapist: "Dr. Martínez",
        sessions: 35,
        nextSession: "2025-07-22",
        status: "activo",
        initials: "LH",
        color: "#f59e0b",
      },
    }),
    prisma.patient.create({
      data: {
        name: "Sofía Torres",
        age: 19,
        diagnosis: "Fobia social",
        therapist: "Dra. López",
        sessions: 5,
        nextSession: "2025-07-16",
        status: "activo",
        initials: "ST",
        color: "#10b981",
      },
    }),
    prisma.patient.create({
      data: {
        name: "Roberto Sánchez",
        age: 38,
        diagnosis: "TEPT",
        therapist: "Dr. Martínez",
        sessions: 15,
        nextSession: "2025-07-25",
        status: "inactivo",
        initials: "RS",
        color: "#3b82f6",
      },
    }),
  ]);

  console.log(`✅ ${patients.length} pacientes creados`);

  // ─── TAREAS ──────────────────────────────────────────────────────────────────
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: "Revisar notas sesión",
        description: "Actualizar notas de la sesión del lunes con María García",
        priority: "alta",
        status: "pendiente",
        due: "2025-07-14",
        category: "administración",
        patientName: "María García",
        patientId: patients[0].id,
      },
    }),
    prisma.task.create({
      data: {
        title: "Preparar plan de tratamiento",
        description: "Elaborar plan de tratamiento trimestral para Carlos Rodríguez",
        priority: "alta",
        status: "pendiente",
        due: "2025-07-15",
        category: "clínico",
        patientName: "Carlos Rodríguez",
        patientId: patients[1].id,
      },
    }),
    prisma.task.create({
      data: {
        title: "Enviar informe mensual",
        description: "Preparar y enviar informe de progreso del mes",
        priority: "media",
        status: "completada",
        due: "2025-07-10",
        category: "administración",
        patientName: "",
      },
    }),
    prisma.task.create({
      data: {
        title: "Actualizar materiales TDAH",
        description: "Revisar y actualizar recursos para pacientes con TDAH",
        priority: "media",
        status: "pendiente",
        due: "2025-07-20",
        category: "educación",
        patientName: "Ana Martínez",
        patientId: patients[2].id,
      },
    }),
    prisma.task.create({
      data: {
        title: "Coordinación con psiquiatría",
        description: "Reunión con psiquiatra para seguimiento de Luis Hernández",
        priority: "alta",
        status: "pendiente",
        due: "2025-07-17",
        category: "clínico",
        patientName: "Luis Hernández",
        patientId: patients[3].id,
      },
    }),
    prisma.task.create({
      data: {
        title: "Técnicas de exposición gradual",
        description: "Preparar jerarquía de exposición para Sofía Torres",
        priority: "media",
        status: "pendiente",
        due: "2025-07-16",
        category: "clínico",
        patientName: "Sofía Torres",
        patientId: patients[4].id,
      },
    }),
    prisma.task.create({
      data: {
        title: "Formulario de alta temporal",
        description: "Completar documentación para alta temporal de Roberto Sánchez",
        priority: "baja",
        status: "pendiente",
        due: "2025-07-25",
        category: "administración",
        patientName: "Roberto Sánchez",
        patientId: patients[5].id,
      },
    }),
  ]);

  console.log(`✅ ${tasks.length} tareas creadas`);

  // ─── CITAS ───────────────────────────────────────────────────────────────────
  const appointments = await Promise.all([
    prisma.appointment.create({
      data: {
        title: "Sesión individual — María García",
        date: "2025-07-15",
        time: "10:00",
        type: "individual",
        location: "Consultorio 1",
      },
    }),
    prisma.appointment.create({
      data: {
        title: "Sesión individual — Carlos Rodríguez",
        date: "2025-07-18",
        time: "11:30",
        type: "individual",
        location: "Consultorio 2",
      },
    }),
    prisma.appointment.create({
      data: {
        title: "Sesión individual — Ana Martínez",
        date: "2025-07-20",
        time: "09:00",
        type: "individual",
        location: "Consultorio 1",
      },
    }),
    prisma.appointment.create({
      data: {
        title: "Reunión de supervisión clínica",
        date: "2025-07-21",
        time: "14:00",
        type: "reunion",
        location: "Sala de reuniones",
      },
    }),
    prisma.appointment.create({
      data: {
        title: "Sesión individual — Luis Hernández",
        date: "2025-07-22",
        time: "10:00",
        type: "individual",
        location: "Consultorio 2",
      },
    }),
    prisma.appointment.create({
      data: {
        title: "Sesión grupal — Fobia social",
        date: "2025-07-23",
        time: "16:00",
        type: "grupal",
        location: "Sala grupal",
      },
    }),
    prisma.appointment.create({
      data: {
        title: "Sesión individual — Sofía Torres",
        date: "2025-07-25",
        time: "15:00",
        type: "individual",
        location: "Consultorio 1",
      },
    }),
  ]);

  console.log(`✅ ${appointments.length} citas creadas`);

  // ─── PIPELINE ────────────────────────────────────────────────────────────────
  const col1 = await prisma.pipelineColumn.create({
    data: { label: "Evaluación Inicial", color: "#dbeafe", accent: "#3b82f6", order: 0 },
  });
  const col2 = await prisma.pipelineColumn.create({
    data: { label: "En Tratamiento", color: "#d1fae5", accent: "#10b981", order: 1 },
  });
  const col3 = await prisma.pipelineColumn.create({
    data: { label: "Seguimiento", color: "#fef3c7", accent: "#f59e0b", order: 2 },
  });
  const col4 = await prisma.pipelineColumn.create({
    data: { label: "Alta Temporal", color: "#fce7f3", accent: "#ec4899", order: 3 },
  });
  const col5 = await prisma.pipelineColumn.create({
    data: { label: "Alta Definitiva", color: "#ede9fe", accent: "#8b5cf6", order: 4 },
  });
  const col6 = await prisma.pipelineColumn.create({
    data: { label: "Urgencias", color: "#fee2e2", accent: "#ef4444", order: 5 },
  });
  const col7 = await prisma.pipelineColumn.create({
    data: { label: "Lista de Espera", color: "#f1f5f9", accent: "#94a3b8", order: 6 },
  });

  // Cases para cada columna
  await Promise.all([
    prisma.pipelineCase.create({
      data: {
        patient: "Sofía Torres",
        age: 19,
        diagnosis: "Fobia social",
        therapist: "Dra. López",
        days: 5,
        overdue: false,
        initials: "ST",
        columnId: col1.id,
        patientId: patients[4].id,
      },
    }),
    prisma.pipelineCase.create({
      data: {
        patient: "María García",
        age: 32,
        diagnosis: "Ansiedad generalizada",
        therapist: "Dra. López",
        days: 45,
        overdue: false,
        initials: "MG",
        columnId: col2.id,
        patientId: patients[0].id,
      },
    }),
    prisma.pipelineCase.create({
      data: {
        patient: "Carlos Rodríguez",
        age: 45,
        diagnosis: "Depresión moderada",
        therapist: "Dr. Martínez",
        days: 30,
        overdue: false,
        initials: "CR",
        columnId: col2.id,
        patientId: patients[1].id,
      },
    }),
    prisma.pipelineCase.create({
      data: {
        patient: "Ana Martínez",
        age: 28,
        diagnosis: "TDAH",
        therapist: "Dra. López",
        days: 90,
        overdue: false,
        initials: "AM",
        columnId: col3.id,
        patientId: patients[2].id,
      },
    }),
    prisma.pipelineCase.create({
      data: {
        patient: "Luis Hernández",
        age: 51,
        diagnosis: "Trastorno bipolar",
        therapist: "Dr. Martínez",
        days: 150,
        overdue: false,
        initials: "LH",
        columnId: col3.id,
        patientId: patients[3].id,
      },
    }),
    prisma.pipelineCase.create({
      data: {
        patient: "Roberto Sánchez",
        age: 38,
        diagnosis: "TEPT",
        therapist: "Dr. Martínez",
        days: 14,
        overdue: true,
        initials: "RS",
        columnId: col4.id,
        patientId: patients[5].id,
      },
    }),
  ]);

  console.log(`✅ 7 columnas pipeline + 6 casos creados`);
  console.log("\n🎉 Seed completado exitosamente!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Error en seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
