import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized } from "@/lib/apiAuth";
import { getScope, agendaScope, patientScope, billingEmail, taskScope } from "@/lib/center";
import { getBillingStatus } from "@/lib/billing";
import { packagesFor } from "@/lib/sessionPackages";

function hoyStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Lo primero que ve al entrar: la Administradora, el pulso del Centro;
 * cada terapeuta, su propio día.
 */
export async function GET() {
  const scope = await getScope();
  if (!scope) return unauthorized();

  const hoy = hoyStr();
  const haceDosSemanas = new Date();
  haceDosSemanas.setDate(haceDosSemanas.getDate() - 14);
  const limite = `${haceDosSemanas.getFullYear()}-${String(haceDosSemanas.getMonth() + 1).padStart(2, "0")}-${String(haceDosSemanas.getDate()).padStart(2, "0")}`;

  const [citasHoy, pacientes, tareas] = await Promise.all([
    prisma.appointment.findMany({
      where: { ...agendaScope(scope), date: hoy, status: { not: "cancelada" } },
      orderBy: { time: "asc" },
    }),
    prisma.patient.findMany({
      where: { ...patientScope(scope), status: "activo" },
      select: { id: true, name: true, therapistEmail: true, attendanceMode: true, homeAddress: true },
    }),
    prisma.task.findMany({
      where: { ...taskScope(scope), status: { not: "completada" }, due: { not: "", lt: hoy } },
      select: { id: true, title: true, due: true, assignedTo: true },
      orderBy: { due: "asc" },
      take: 20,
    }),
  ]);

  // Pacientes sin sesión en las últimas dos semanas
  const ultimas = await prisma.sessionRecord.groupBy({
    by: ["patientId"],
    where: { patientId: { in: pacientes.map((p) => p.id) } },
    _max: { date: true },
  });
  const ultimaDe = new Map(ultimas.map((u) => [u.patientId, u._max.date ?? ""]));
  const sinSesion = pacientes.filter((p) => (ultimaDe.get(p.id) ?? "") < limite);

  // Datos del paciente para cada cita de hoy (domicilio, dirección)
  const porId = new Map(pacientes.map((p) => [p.id, p]));
  const agendaHoy = citasHoy.map((c) => {
    const p = c.patientId ? porId.get(c.patientId) : undefined;
    return {
      id: c.id,
      title: c.title,
      time: c.time,
      type: c.type,
      therapistEmail: c.createdBy,
      aDomicilio: p?.attendanceMode === "domicilio" || p?.attendanceMode === "ambos",
      direccion: p?.homeAddress ?? "",
    };
  });

  const base = {
    role: scope.role,
    centerName: scope.centerName,
    today: agendaHoy,
    overdueTasks: tareas,
    withoutSessions: sinSesion.slice(0, 20).map((p) => ({ id: p.id, name: p.name, therapistEmail: p.therapistEmail, last: ultimaDe.get(p.id) ?? "" })),
    withoutSessionsCount: sinSesion.length,
  };

  if (!scope.isAdmin) return NextResponse.json(base);

  // Solo la Administradora ve el dinero y los créditos
  const [billing, paquetes, deudaSesiones] = await Promise.all([
    getBillingStatus(billingEmail(scope)),
    packagesFor(scope),
    prisma.sessionRecord.findMany({
      where: { patientId: { in: pacientes.map((p) => p.id) }, attended: true, paid: false },
      select: { patientId: true, value: true },
    }),
  ]);

  const valorDe = new Map(
    (await prisma.patient.findMany({ where: { id: { in: pacientes.map((p) => p.id) } }, select: { id: true, sessionValue: true } }))
      .map((p) => [p.id, p.sessionValue || 0])
  );
  const porCobrar = deudaSesiones.reduce(
    (acc, s) => acc + (s.value !== null && s.value !== undefined ? s.value : valorDe.get(s.patientId) ?? 0),
    0
  );

  return NextResponse.json({
    ...base,
    credits: { disponibles: billing.totalRemaining, incluidos: billing.includedTotal },
    pendingAmount: porCobrar,
    pendingSessions: deudaSesiones.length,
    packagesEnding: paquetes.filter((p) => p.endingSoon || (p.expired && p.remaining > 0)).length,
  });
}
