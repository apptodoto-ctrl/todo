import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, loadPatient } from "@/lib/center";

/**
 * Detalle mensual de un paciente para emitir su boleta: cada sesión con su
 * fecha, su valor, si se pagó, y los totales del mes (N2).
 */
export async function GET(req: NextRequest) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const patientId = Number(req.nextUrl.searchParams.get("patientId"));
    const now = new Date();
    const month = req.nextUrl.searchParams.get("month") || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (!patientId) return NextResponse.json({ error: "Falta el usuario" }, { status: 400 });

    const { patient, status } = await loadPatient(scope, patientId);
    if (status === 404) return notFound();
    if (status === 403 || !patient) return forbidden();

    const [user, records] = await Promise.all([
      prisma.user.findUnique({ where: { email: scope.email }, select: { currency: true, name: true, specialty: true } }),
      prisma.sessionRecord.findMany({
        where: { patientId, date: { startsWith: month } },
        orderBy: { date: "asc" },
        select: { id: true, date: true, duration: true, attended: true, paid: true, value: true, packageId: true },
      }),
    ]);

    const valueOf = (r: { value: number | null }) => (r.value !== null && r.value !== undefined ? r.value : patient.sessionValue || 0);
    const billable = records.filter((r) => r.attended);
    const sessions = records.map((r) => ({
      id: r.id,
      date: r.date,
      duration: r.duration,
      attended: r.attended,
      paid: r.paid,
      inPackage: r.packageId !== null,
      value: r.attended ? valueOf(r) : 0,
    }));

    const total = billable.reduce((acc, r) => acc + valueOf(r), 0);
    const paid = billable.filter((r) => r.paid).reduce((acc, r) => acc + valueOf(r), 0);

    return NextResponse.json({
      month,
      currency: user?.currency ?? "CLP",
      therapist: { name: user?.name ?? "", specialty: user?.specialty ?? "" },
      patient: { id: patient.id, name: patient.name, rut: patient.rut, guardian: patient.guardian, sessionValue: patient.sessionValue },
      sessions,
      attendedCount: billable.length,
      missedCount: records.length - billable.length,
      withoutValue: billable.filter((r) => valueOf(r) === 0).length,
      total,
      paid,
      pending: total - paid,
    });
  } catch (err) {
    console.error("Patient finance error:", err);
    return NextResponse.json({ error: "No se pudo calcular el resumen" }, { status: 500 });
  }
}
