import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden } from "@/lib/apiAuth";
import { COMP_TIER } from "@/lib/billing";

// Activa o quita el acceso de cortesía (plan sin cobro) de una cuenta.
// body: { email, enabled }
export async function PUT(req: NextRequest) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  if (session.role !== "admin") return forbidden();

  try {
    const { email, enabled } = await req.json();
    const target = String(email || "").trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: target } });
    if (!user) return NextResponse.json({ error: "No existe una cuenta con ese correo" }, { status: 404 });

    const existing = await prisma.subscription.findUnique({ where: { userEmail: target } });

    if (enabled) {
      // Una suscripción de Stripe activa seguiría cobrando: hay que cancelarla aparte
      if (existing?.stripeSubscriptionId) {
        return NextResponse.json(
          { error: "Esta cuenta tiene una suscripción pagada en Stripe. Cancélala primero desde Stripe para no cobrarle." },
          { status: 409 }
        );
      }
      const next = new Date();
      next.setMonth(next.getMonth() + 1);
      const data = {
        tierCode: COMP_TIER,
        status: "comp",
        trialEndsAt: null,
        includedCreditsUsed: 0,
        currentPeriodEnd: next,
      };
      const sub = existing
        ? await prisma.subscription.update({ where: { userEmail: target }, data })
        : await prisma.subscription.create({ data: { userEmail: target, ...data } });
      await prisma.creditLedger.create({
        data: { userEmail: target, amount: 0, reason: `comp_granted_by_${session.email}` },
      });
      return NextResponse.json({ ok: true, status: sub.status, tierCode: sub.tierCode });
    }

    // Quitar cortesía: la cuenta pasa a solo lectura hasta que elija un plan (sus datos se conservan)
    if (!existing || existing.status !== "comp") {
      return NextResponse.json({ error: "Esta cuenta no tiene acceso de cortesía" }, { status: 400 });
    }
    await prisma.subscription.update({
      where: { userEmail: target },
      data: { status: "canceled", currentPeriodEnd: new Date() },
    });
    await prisma.creditLedger.create({
      data: { userEmail: target, amount: 0, reason: `comp_revoked_by_${session.email}` },
    });
    return NextResponse.json({ ok: true, status: "canceled" });
  } catch (err) {
    console.error("Comp toggle error:", err);
    return NextResponse.json({ error: "No se pudo actualizar la cuenta" }, { status: 500 });
  }
}
