import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff, audit, requiresReason, ACCOUNT_STATES, RETENTION_DAYS } from "@/lib/adminPanel";

type Params = Promise<{ email: string }>;

/** Ficha completa de una cuenta: datos, plan, créditos, uso e historial */
export async function GET(_: Request, { params }: { params: Params }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { email: raw } = await params;
  const email = decodeURIComponent(raw);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { email: true, name: true, phone: true, country: true, currency: true, specialty: true, createdAt: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "No existe esa cuenta" }, { status: 404 });

  const [sub, center, membership, patients, appointments, ledger, audits] = await Promise.all([
    prisma.subscription.findUnique({ where: { userEmail: email } }),
    prisma.center.findFirst({ where: { adminEmail: email }, select: { id: true, name: true, seats: true, extraSeats: true } }),
    prisma.centerMember.findFirst({ where: { userEmail: email, active: true }, include: { center: { select: { name: true } } } }),
    prisma.patient.count({ where: { createdBy: email } }),
    prisma.appointment.count({ where: { createdBy: email } }),
    prisma.creditLedger.findMany({ where: { userEmail: email }, orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.adminAuditLog.findMany({ where: { targetEmail: email }, orderBy: { createdAt: "desc" }, take: 40 }),
  ]);

  // Uso de IA del mes, solo números: nunca contenido de pacientes
  const desde = new Date(new Date().setDate(1));
  const usoIA = ledger.filter((l) => l.reason === "consume" && l.createdAt >= desde);

  return NextResponse.json({
    user,
    subscription: sub,
    center,
    membership: membership ? { centerName: membership.center.name, role: membership.role } : null,
    usage: { patients, appointments, aiCreditsMonth: usoIA.reduce((a, l) => a + Math.abs(l.amount), 0) },
    ledger,
    audits,
    retentionDays: RETENTION_DAYS,
  });
}

/** Cambios sobre una cuenta, siempre anotados */
export async function PATCH(req: Request, { params }: { params: Params }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    const { email: raw } = await params;
    const email = decodeURIComponent(raw);
    const body = await req.json();
    const action = String(body.action ?? "");
    const reason = String(body.reason ?? "").trim();
    const actor = String(body.actor ?? staff.name);

    if (requiresReason(action) && !reason) {
      return NextResponse.json({ error: "Este cambio necesita que escribas el motivo" }, { status: 400 });
    }

    const antes = await prisma.subscription.findUnique({ where: { userEmail: email } });
    if (!antes) return NextResponse.json({ error: "Esa cuenta no tiene suscripción" }, { status: 404 });

    let data: Record<string, unknown> = {};
    switch (action) {
      case "cambiar_estado": {
        if (!ACCOUNT_STATES.includes(body.state)) {
          return NextResponse.json({ error: "Situación no válida" }, { status: 400 });
        }
        data = { accountState: body.state, stateReason: reason, stateChangedAt: new Date() };
        // La situación manda también sobre el acceso real
        if (body.state === "suspendida" || body.state === "cancelada") data.status = "canceled";
        else if (body.state === "comp") data.status = "comp";
        else if (body.state === "active") data.status = "active";
        else if (body.state === "trial" || body.state === "beta") data.status = "trialing";
        break;
      }
      case "cambiar_plan":
        if (!body.tierCode) return NextResponse.json({ error: "Falta el plan" }, { status: 400 });
        data = { tierCode: String(body.tierCode) };
        break;
      case "ajustar_creditos":
        data = { purchasedCredits: Math.max(0, antes.purchasedCredits + Number(body.amount || 0)) };
        break;
      case "alargar_prueba":
        data = { trialEndsAt: new Date(String(body.until)) };
        break;
      case "regalar_meses": {
        const base = antes.currentPeriodEnd && antes.currentPeriodEnd > new Date() ? antes.currentPeriodEnd : new Date();
        const nueva = new Date(base);
        nueva.setMonth(nueva.getMonth() + Math.max(1, Number(body.months || 1)));
        data = { currentPeriodEnd: nueva };
        break;
      }
      case "marcar_beta":
        data = { betaGroup: String(body.betaGroup ?? "Beta"), betaUntil: body.betaUntil ? new Date(String(body.betaUntil)) : null, accountState: "beta", status: "trialing" };
        break;
      case "notas_internas":
        data = { internalNotes: String(body.internalNotes ?? "").slice(0, 2000), tags: (Array.isArray(body.tags) ? body.tags.map(String) : []) as never };
        break;
      default:
        return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
    }

    const despues = await prisma.subscription.update({ where: { userEmail: email }, data });
    await audit({ actor, targetEmail: email, action, before: antes, after: despues, reason });

    return NextResponse.json(despues);
  } catch (err) {
    console.error("Admin account patch error:", err);
    return NextResponse.json({ error: "No se pudo aplicar el cambio" }, { status: 500 });
  }
}
