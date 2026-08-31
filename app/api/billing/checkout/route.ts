import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { getOrCreateSubscription, getSetting } from "@/lib/billing";

const APP_URL = process.env.NEXTAUTH_URL || "https://app.todo-to.com";

export async function POST(req: NextRequest) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  if (!stripeEnabled()) {
    return NextResponse.json({ error: "Los pagos aún no están habilitados. Intenta más tarde." }, { status: 503 });
  }
  try {
    const { tierCode, cycle } = await req.json();
    const tier = await prisma.planTier.findUnique({ where: { code: tierCode } });
    if (!tier || !tier.active || tier.isAddon) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
    }
    const yearly = cycle === "yearly";
    const currency = await getSetting("currency", "usd");
    const amount = yearly ? tier.priceYearly : tier.priceMonthly;

    const stripe = getStripe();
    const sub = await getOrCreateSubscription(session.email);

    let customerId = sub.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: session.email, name: session.name, metadata: { userEmail: session.email } });
      customerId = customer.id;
      await prisma.subscription.update({ where: { userEmail: session.email }, data: { stripeCustomerId: customerId } });
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      allow_promotion_codes: true,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amount * 100,
            recurring: { interval: yearly ? "year" : "month" },
            product_data: {
              name: `TOdo ${tier.plan} — ${tier.code}`,
              description: `${tier.maxPatients ? `Hasta ${tier.maxPatients} pacientes` : "Pacientes sin tope"} · ${tier.aiCredits} créditos de IA/${yearly ? "mes" : "mes"}`,
            },
          },
        },
      ],
      subscription_data: {
        metadata: { userEmail: session.email, tierCode: tier.code, cycle: yearly ? "yearly" : "monthly" },
      },
      metadata: { userEmail: session.email, tierCode: tier.code, cycle: yearly ? "yearly" : "monthly", kind: "plan" },
      success_url: `${APP_URL}/dashboard/plan?checkout=success`,
      cancel_url: `${APP_URL}/dashboard/plan?checkout=cancel`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "No se pudo iniciar el pago" }, { status: 500 });
  }
}
