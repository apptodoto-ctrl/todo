import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";
import { getScope } from "@/lib/center";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { getBillingStatus, getSetting } from "@/lib/billing";

const APP_URL = process.env.NEXTAUTH_URL || "https://app.todo-to.com";

export async function POST(req: NextRequest) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  // En un Centro, el plan y los créditos los maneja solo la Administradora
  const scope = await getScope();
  if (scope?.centerId && !scope.isAdmin) {
    return NextResponse.json(
      { error: "El plan y los créditos del Centro los maneja la Administradora." },
      { status: 403 }
    );
  }
  if (!stripeEnabled()) {
    return NextResponse.json({ error: "Los pagos aún no están habilitados. Intenta más tarde." }, { status: 503 });
  }
  try {
    const { packCode } = await req.json();
    const pack = await prisma.creditPack.findUnique({ where: { code: packCode } });
    if (!pack || !pack.active) return NextResponse.json({ error: "Recarga inválida" }, { status: 400 });

    // Recargas solo para Profesional y Centro (no trial ni Esencial)
    const status = await getBillingStatus(session.email);
    const plan = (status.tier?.plan ?? "").toLowerCase();
    if (status.subscription.status === "trialing" || !["profesional", "centro"].includes(plan)) {
      return NextResponse.json({ error: "Las recargas están disponibles solo para los planes Profesional y Centro" }, { status: 403 });
    }

    const currency = await getSetting("currency", "usd");
    const stripe = getStripe();
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      ...(status.subscription.stripeCustomerId ? { customer: status.subscription.stripeCustomerId } : { customer_email: session.email }),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: pack.price * 100,
            product_data: { name: `TOdo — ${pack.credits} créditos de IA`, description: "Los créditos comprados se acumulan y no vencen con el ciclo" },
          },
        },
      ],
      metadata: { userEmail: session.email, kind: "credits", credits: String(pack.credits), packCode: pack.code },
      success_url: `${APP_URL}/dashboard/plan?credits=success`,
      cancel_url: `${APP_URL}/dashboard/plan?credits=cancel`,
    });
    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("Buy credits error:", err);
    return NextResponse.json({ error: "No se pudo iniciar el pago" }, { status: 500 });
  }
}
