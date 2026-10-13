import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getBillingStatus } from "@/lib/billing";

/** Umbral del aviso: queda el 20 % de los créditos del ciclo */
const WARN_RATIO = 0.2;

/**
 * Avisa una sola vez por ciclo cuando la bolsa baja del 20 %, y otra vez
 * cuando se acaba. En una cuenta individual el aviso le llega a la
 * terapeuta; en un Centro, a la Administradora.
 */
export async function checkCreditAlert(subscriptionEmail: string): Promise<void> {
  const billing = await getBillingStatus(subscriptionEmail);
  const incluidos = billing.includedTotal;
  if (incluidos <= 0) return;

  const restantes = billing.totalRemaining;
  const nivel = restantes <= 0 ? "agotados" : restantes / incluidos <= WARN_RATIO ? "pocos" : null;
  if (!nivel) return;

  // Un aviso por nivel y por ciclo
  const desdeCiclo = billing.subscription.currentPeriodEnd
    ? new Date(new Date(billing.subscription.currentPeriodEnd).setMonth(new Date(billing.subscription.currentPeriodEnd).getMonth() - 1))
    : new Date(new Date().setDate(1));
  const razon = `alert_credits_${nivel}`;
  const yaAvisado = await prisma.creditLedger.findFirst({
    where: { userEmail: subscriptionEmail, reason: razon, createdAt: { gte: desdeCiclo } },
  });
  if (yaAvisado) return;

  const center = await prisma.center.findFirst({ where: { adminEmail: subscriptionEmail }, select: { name: true } });
  const quien = center ? `del Centro ${center.name}` : "de tu cuenta";

  try {
    await sendEmail(
      subscriptionEmail,
      nivel === "agotados" ? `Se acabaron los créditos de IA ${quien}` : `Quedan pocos créditos de IA ${quien}`,
      `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:22px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:19px;">${nivel === "agotados" ? "Créditos agotados" : "Quedan pocos créditos"}</h1>
        </div>
        <div style="background:#f8fafc;padding:22px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">
          <p style="color:#475569;margin:0 0 12px;line-height:1.5;">
            ${nivel === "agotados"
              ? `Las herramientas de inteligencia artificial ${quien} quedaron sin créditos por este ciclo.`
              : `Quedan <strong>${restantes}</strong> de ${incluidos} créditos de IA ${quien} en este ciclo.`}
          </p>
          <p style="color:#475569;margin:0 0 16px;line-height:1.5;">
            Puedes comprar una recarga desde <strong>Mi plan</strong>, o esperar a que se renueven solos.
          </p>
          <p style="color:#94a3b8;font-size:12px;margin:0;">El resto de TOdo sigue funcionando con normalidad.</p>
        </div>
      </div>`
    );
    await prisma.creditLedger.create({
      data: { userEmail: subscriptionEmail, featureKey: "", amount: 0, reason: razon },
    });
  } catch (err) {
    console.error("[credits] no se pudo avisar del saldo:", err);
  }
}
