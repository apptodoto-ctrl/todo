import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { resetCycleCredits } from "@/lib/billing";
import { sendEmail } from "@/lib/email";

async function emailFromCustomer(customerId: string): Promise<string | null> {
  const sub = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
  return sub?.userEmail ?? null;
}

// Avisa al correo de administración cada movimiento de suscripción
async function notifyBilling(subject: string, lines: string[]) {
  try {
    const setting = await prisma.pricingSetting.findUnique({ where: { key: "billing_notify_email" } });
    const to = setting?.value;
    if (!to?.includes("@")) return;
    await sendEmail(
      to,
      `TOdo · ${subject}`,
      `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
         <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:20px;border-radius:12px 12px 0 0;">
           <h1 style="color:white;margin:0;font-size:18px;">${subject}</h1>
         </div>
         <div style="background:#f8fafc;padding:20px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
           ${lines.map((l) => `<p style="color:#475569;margin:0 0 6px;">${l}</p>`).join("")}
         </div>
       </div>`
    );
  } catch (err) {
    console.error("[billing] aviso de pago falló:", err);
  }
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
          await notifyBilling("Nueva suscripción", [`Terapeuta: <strong>${userEmail}</strong>`, `Plan: ${cs.metadata.tierCode}`, `Ciclo: ${cs.metadata.cycle === "yearly" ? "anual" : "mensual"}`]);
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
        await notifyBilling("Suscripción cancelada", [`Terapeuta: <strong>${userEmail}</strong>`, "La cuenta pasa a solo lectura al terminar el ciclo pagado."]);
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
        await notifyBilling("Pago recibido", [`Terapeuta: <strong>${userEmail}</strong>`, `Monto: ${((inv.amount_paid ?? 0) / 100).toFixed(2)} ${(inv.currency ?? "usd").toUpperCase()}`, `Motivo: ${inv.billing_reason ?? "pago"}`]);
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
        await notifyBilling("Pago rechazado", [`Terapeuta: <strong>${userEmail}</strong>`, "Stripe reintentará el cobro. La cuenta mantiene acceso mientras tanto."]);
        break;
      }
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`Webhook handler error (${event.type}):`, err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }
}
