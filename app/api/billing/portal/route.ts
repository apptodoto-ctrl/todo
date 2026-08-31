import { NextResponse } from "next/server";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { getOrCreateSubscription } from "@/lib/billing";

const APP_URL = process.env.NEXTAUTH_URL || "https://app.todo-to.com";

// Portal de cliente de Stripe: cambiar tarjeta, ver facturas, cancelar
export async function POST() {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  if (!stripeEnabled()) {
    return NextResponse.json({ error: "Los pagos aún no están habilitados" }, { status: 503 });
  }
  try {
    const sub = await getOrCreateSubscription(session.email);
    if (!sub.stripeCustomerId) {
      return NextResponse.json({ error: "Aún no tienes una suscripción de pago" }, { status: 400 });
    }
    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${APP_URL}/dashboard/plan`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    console.error("Portal error:", err);
    return NextResponse.json({ error: "No se pudo abrir el portal de pagos" }, { status: 500 });
  }
}
