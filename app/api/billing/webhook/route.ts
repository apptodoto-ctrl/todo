import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { resetCycleCredits } from "@/lib/billing";

async function emailFromCustomer(customerId: string): Promise<string | null> {
  const sub = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
  return sub?.userEmail ?? null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Sin firma" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const userEmail = cs.metadata?.userEmail;
        if (!userEmail) break;

        if (cs.metadata?.kind === "credits") {
          // Recarga: los créditos comprados se acumulan
          const credits = Number(cs.metadata.credits || 0);
          if (credits > 0) {
            await prisma.subscription.update({
              where: { userEmail },
              data: { purchasedCredits: { increment: credits } },
            });
            await prisma.creditLedger.create({
              data: { userEmail, amount: credits, reason: `purchase_${cs.metadata.packCode || "pack"}` },
            });
          }
        } else if (cs.metadata?.kind === "plan") {
          // Nueva suscripción de pago: reemplaza el trial de inmediato, créditos nuevos al instante
          await prisma.subscription.update({
            where: { userEmail },
            data: {
              tierCode: cs.metadata.tierCode || "profesional_20",
              billingCycle: cs.metadata.cycle || "monthly",
              status: "active",
              stripeSubscriptionId: typeof cs.subscription === "string" ? cs.subscription : "",
              includedCreditsUsed: 0,
              trialEndsAt: null,
            },
          });
          await prisma.creditLedger.create({ data: { userEmail, amount: 0, reason: `plan_start_${cs.metadata.tierCode}` } });
        }
        break;
      }

      case "customer.subscription.updated": {
        const s = event.data.object as Stripe.Subscription;
        const userEmail = s.metadata?.userEmail || (typeof s.customer === "string" ? await emailFromCustomer(s.customer) : null);
        if (!userEmail) break;
        const periodEnd = s.items?.data?.[0]?.current_period_end;
        await prisma.subscription.updateMany({
          where: { userEmail },
          data: {
            status: s.status,
            ...(s.metadata?.tierCode ? { tierCode: s.metadata.tierCode } : {}),
            ...(periodEnd ? { currentPeriodEnd: new Date(periodEnd * 1000) } : {}),
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const s = event.data.object as Stripe.Subscription;
        const userEmail = s.metadata?.userEmail || (typeof s.customer === "string" ? await emailFromCustomer(s.customer) : null);
        if (!userEmail) break;
        // Baja efectiva al terminar el ciclo pagado; lo generado queda visible (solo lectura)
        await prisma.subscription.updateMany({
          where: { userEmail },
          data: { status: "canceled", stripeSubscriptionId: "" },
        });
        break;
      }

      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : null;
        if (!customerId) break;
        const userEmail = await emailFromCustomer(customerId);
        if (!userEmail) break;
        await prisma.subscription.updateMany({ where: { userEmail }, data: { status: "active" } });
        // Nuevo ciclo pagado: los créditos incluidos se renuevan (no se acumulan)
        if (inv.billing_reason === "subscription_cycle") {
          await resetCycleCredits(userEmail);
        }
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : null;
        if (!customerId) break;
        const userEmail = await emailFromCustomer(customerId);
        if (!userEmail) break;
        // Acceso normal durante reintentos y gracia (Stripe reintenta según su configuración)
        await prisma.subscription.updateMany({ where: { userEmail }, data: { status: "past_due" } });
        break;
      }
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`Webhook handler error (${event.type}):`, err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }
}
