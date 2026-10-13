import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden } from "@/lib/apiAuth";
import { getScope, billingEmail } from "@/lib/center";
import { getBillingStatus } from "@/lib/billing";

/**
 * Bolsa de créditos del Centro: cuántos quedan y cuántos gastó cada
 * terapeuta este ciclo. Solo la Administradora.
 */
export async function GET() {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId || !scope.isAdmin) return forbidden();

  const billing = await getBillingStatus(billingEmail(scope));
  const desde = billing.subscription.currentPeriodEnd
    ? new Date(new Date(billing.subscription.currentPeriodEnd).setMonth(new Date(billing.subscription.currentPeriodEnd).getMonth() - 1))
    : new Date(new Date().setDate(1));

  const miembros = await prisma.centerMember.findMany({
    where: { centerId: scope.centerId, active: true },
    select: { userEmail: true, name: true },
  });

  const movimientos = await prisma.creditLedger.groupBy({
    by: ["userEmail"],
    where: {
      userEmail: { in: miembros.map((m) => m.userEmail) },
      reason: "consume",
      createdAt: { gte: desde },
    },
    _sum: { amount: true },
  });
  const gastoPor = new Map(movimientos.map((m) => [m.userEmail, Math.abs(m._sum.amount ?? 0)]));

  const porHerramienta = await prisma.creditLedger.groupBy({
    by: ["featureKey"],
    where: {
      userEmail: { in: miembros.map((m) => m.userEmail) },
      reason: "consume",
      createdAt: { gte: desde },
    },
    _sum: { amount: true },
  });

  return NextResponse.json({
    incluidos: billing.includedTotal,
    disponibles: billing.totalRemaining,
    comprados: billing.purchased,
    renueva: billing.subscription.currentPeriodEnd,
    porTerapeuta: miembros
      .map((m) => ({ email: m.userEmail, name: m.name || m.userEmail, usados: gastoPor.get(m.userEmail) ?? 0 }))
      .sort((a, b) => b.usados - a.usados),
    porHerramienta: porHerramienta.map((h) => ({ clave: h.featureKey, usados: Math.abs(h._sum.amount ?? 0) })),
  });
}
