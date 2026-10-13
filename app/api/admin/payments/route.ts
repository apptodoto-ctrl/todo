import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff, audit } from "@/lib/adminPanel";
import { getStripe, stripeEnabled } from "@/lib/stripe";

/** Cobros de Stripe con su estado, para contabilidad y soporte */
export async function GET(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  if (!stripeEnabled()) return NextResponse.json({ enabled: false, payments: [] });

  const email = req.nextUrl.searchParams.get("email") ?? "";
  try {
    const stripe = getStripe();
    let customerId: string | undefined;
    if (email) {
      const sub = await prisma.subscription.findUnique({ where: { userEmail: email }, select: { stripeCustomerId: true } });
      customerId = sub?.stripeCustomerId || undefined;
      if (!customerId) return NextResponse.json({ enabled: true, payments: [] });
    }

    const intents = await stripe.paymentIntents.list({ limit: 50, ...(customerId ? { customer: customerId } : {}) });
    const payments = intents.data.map((p) => ({
      id: p.id,
      amount: p.amount / 100,
      currency: p.currency.toUpperCase(),
      status: p.status,
      created: new Date(p.created * 1000),
      customer: typeof p.customer === "string" ? p.customer : null,
      email: p.receipt_email ?? "",
      receiptUrl: p.latest_charge ? null : null,
      refunded: false,
    }));
    return NextResponse.json({ enabled: true, payments });
  } catch (err) {
    console.error("Admin payments error:", err);
    return NextResponse.json({ error: "No se pudo consultar Stripe" }, { status: 500 });
  }
}

/** Registrar un pago hecho fuera de Stripe (transferencia u otro medio) */
export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    const body = await req.json();
    const email = String(body.email ?? "");
    const reason = String(body.reason ?? "").trim();
    if (!reason) return NextResponse.json({ error: "Escribe el motivo del pago a mano" }, { status: 400 });

    const antes = await prisma.subscription.findUnique({ where: { userEmail: email } });
    if (!antes) return NextResponse.json({ error: "Esa cuenta no tiene suscripción" }, { status: 404 });

    // Extiende el período pagado y reactiva la cuenta
    const base = antes.currentPeriodEnd && antes.currentPeriodEnd > new Date() ? antes.currentPeriodEnd : new Date();
    const hasta = new Date(base);
    hasta.setMonth(hasta.getMonth() + Math.max(1, Number(body.months || 1)));

    const despues = await prisma.subscription.update({
      where: { userEmail: email },
      data: { currentPeriodEnd: hasta, status: "active", accountState: "active", stateReason: reason, stateChangedAt: new Date() },
    });

    await audit({
      actor: String(body.actor ?? staff.name),
      targetEmail: email,
      action: "pago_a_mano",
      before: { currentPeriodEnd: antes.currentPeriodEnd, status: antes.status },
      after: { currentPeriodEnd: despues.currentPeriodEnd, status: despues.status, monto: body.amount ?? null, medio: body.method ?? "" },
      reason,
    });

    return NextResponse.json(despues);
  } catch (err) {
    console.error("Admin manual payment error:", err);
    return NextResponse.json({ error: "No se pudo registrar el pago" }, { status: 500 });
  }
}
