import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";

/**
 * Resumen económico de la consulta: facturado del mes, pendiente de cobro
 * y detalle por paciente. Alimenta la pestaña Facturación, el inicio y la
 * alerta de deuda del listado de usuarios.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const monthParam = req.nextUrl.searchParams.get("month"); // YYYY-MM
    const now = new Date();
    const month = monthParam || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [user, patients] = await Promise.all([
      prisma.user.findUnique({ where: { email: session.email }, select: { currency: true } }),
      prisma.patient.findMany({
        where: { createdBy: session.email },
        select: { id: true, name: true, sessionValue: true, status: true, initials: true, color: true },
      }),
    ]);
    const patientIds = patients.map((p) => p.id);
    const sessions = await prisma.sessionRecord.findMany({
      where: { patientId: { in: patientIds } },
      select: { id: true, patientId: true, date: true, attended: true, paid: true },
    });

    const valueOf = new Map(patients.map((p) => [p.id, p.sessionValue || 0]));
    // Solo las sesiones a las que el paciente asistió generan cobro
    const billable = sessions.filter((s) => s.attended);

    const monthSessions = billable.filter((s) => s.date.startsWith(month));
    const sum = (list: typeof billable) => list.reduce((acc, s) => acc + (valueOf.get(s.patientId) ?? 0), 0);

    const byPatient = patients
      .map((p) => {
        const mine = billable.filter((s) => s.patientId === p.id);
        const unpaid = mine.filter((s) => !s.paid);
        const mineMonth = mine.filter((s) => s.date.startsWith(month));
        return {
          id: p.id,
          name: p.name,
          initials: p.initials,
          color: p.color,
          status: p.status,
          sessionValue: p.sessionValue || 0,
          sessionsMonth: mineMonth.length,
          amountMonth: sum(mineMonth),
          unpaidCount: unpaid.length,
          unpaidAmount: sum(unpaid),
        };
      })
      .sort((a, b) => b.unpaidAmount - a.unpaidAmount || b.amountMonth - a.amountMonth);

    return NextResponse.json({
      month,
      currency: user?.currency ?? "CLP",
      invoicedMonth: sum(monthSessions),
      sessionsMonth: monthSessions.length,
      paidMonth: sum(monthSessions.filter((s) => s.paid)),
      pendingMonth: sum(monthSessions.filter((s) => !s.paid)),
      pendingTotal: sum(billable.filter((s) => !s.paid)),
      pendingPatients: byPatient.filter((p) => p.unpaidCount > 0).length,
      byPatient,
    });
  } catch (err) {
    console.error("Finance summary error:", err);
    return NextResponse.json({ error: "No se pudo calcular el resumen" }, { status: 500 });
  }
}
