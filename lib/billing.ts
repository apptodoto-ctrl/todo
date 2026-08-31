import { prisma } from "@/lib/db";

// Estados de suscripción que mantienen el acceso completo.
// Según el pricing: pago rechazado (past_due) conserva acceso normal durante reintentos y gracia.
const ACTIVE_STATUSES = ["trialing", "active", "past_due"];

export async function getSetting(key: string, fallback: string): Promise<string> {
  const s = await prisma.pricingSetting.findUnique({ where: { key } });
  return s?.value ?? fallback;
}

// Crea el trial (sin tarjeta) la primera vez que el usuario necesita una suscripción
export async function getOrCreateSubscription(userEmail: string) {
  let sub = await prisma.subscription.findUnique({ where: { userEmail } });
  if (sub) return sub;
  const trialDays = Number(await getSetting("trial_days", "7"));
  const trialTier = await getSetting("trial_tier", "profesional_30");
  const trialCredits = Number(await getSetting("trial_credits", "40"));
  sub = await prisma.subscription.create({
    data: {
      userEmail,
      tierCode: trialTier,
      status: "trialing",
      trialEndsAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
      trialCredits,
    },
  });
  await prisma.creditLedger.create({
    data: { userEmail, amount: trialCredits, reason: "trial_grant" },
  });
  return sub;
}

export interface BillingStatus {
  subscription: Awaited<ReturnType<typeof getOrCreateSubscription>>;
  tier: { code: string; plan: string; maxPatients: number | null; aiCredits: number; priceMonthly: number; priceYearly: number } | null;
  effectiveStatus: string; // trialing | active | past_due | expired
  includedTotal: number;
  includedRemaining: number;
  purchased: number;
  totalRemaining: number;
  maxPatients: number | null;
  planName: string;
}

export async function getBillingStatus(userEmail: string): Promise<BillingStatus> {
  const sub = await getOrCreateSubscription(userEmail);
  const tier = await prisma.planTier.findUnique({ where: { code: sub.tierCode } });

  let effectiveStatus = sub.status;
  if (sub.status === "trialing" && sub.trialEndsAt && sub.trialEndsAt < new Date()) {
    effectiveStatus = "expired"; // trial vencido sin elegir plan → solo lectura
  }
  if (["canceled", "unpaid", "incomplete_expired"].includes(sub.status)) {
    effectiveStatus = "expired";
  }

  const isTrial = sub.status === "trialing";
  const includedTotal = isTrial ? sub.trialCredits : (tier?.aiCredits ?? 0);
  const includedRemaining = Math.max(0, includedTotal - sub.includedCreditsUsed);
  const purchased = sub.purchasedCredits;

  const trialMaxPatients = Number(await getSetting("trial_max_patients", "10"));
  const maxPatients = isTrial ? trialMaxPatients : (tier?.maxPatients ?? null);

  return {
    subscription: sub,
    tier: tier ? { code: tier.code, plan: tier.plan, maxPatients: tier.maxPatients, aiCredits: tier.aiCredits, priceMonthly: tier.priceMonthly, priceYearly: tier.priceYearly } : null,
    effectiveStatus,
    includedTotal,
    includedRemaining,
    purchased,
    totalRemaining: includedRemaining + purchased,
    maxPatients,
    planName: isTrial ? "Prueba gratis" : (tier ? `${tier.plan} (${tier.code})` : sub.tierCode),
  };
}

export function hasFullAccess(effectiveStatus: string): boolean {
  return ACTIVE_STATUSES.includes(effectiveStatus);
}

// ¿El plan del usuario tiene acceso a esta función de IA?
export async function featureAllowed(tierCode: string, isTrial: boolean, featureKey: string): Promise<{ allowed: boolean; cost: number; name: string }> {
  const feature = await prisma.aiFeature.findUnique({ where: { key: featureKey } });
  if (!feature || !feature.active) return { allowed: false, cost: 0, name: featureKey };
  if (isTrial) return { allowed: true, cost: feature.creditCost, name: feature.name }; // trial = IA completa
  const tier = await prisma.planTier.findUnique({ where: { code: tierCode } });
  const plan = (tier?.plan ?? "").toLowerCase();
  const allowed =
    plan === "esencial" ? feature.esencial :
    plan === "profesional" ? feature.profesional :
    plan === "centro" ? feature.centro : false;
  return { allowed, cost: feature.creditCost, name: feature.name };
}

// Descuenta créditos: primero los incluidos del ciclo, después los comprados.
export async function consumeCredits(userEmail: string, featureKey: string, cost: number): Promise<boolean> {
  const status = await getBillingStatus(userEmail);
  if (status.totalRemaining < cost) return false;
  const fromIncluded = Math.min(status.includedRemaining, cost);
  const fromPurchased = cost - fromIncluded;
  await prisma.subscription.update({
    where: { userEmail },
    data: {
      includedCreditsUsed: { increment: fromIncluded },
      ...(fromPurchased > 0 ? { purchasedCredits: { decrement: fromPurchased } } : {}),
    },
  });
  await prisma.creditLedger.create({
    data: { userEmail, featureKey, amount: -cost, reason: "consume" },
  });
  return true;
}

// Si la generación falla, los créditos vuelven solos.
export async function refundCredits(userEmail: string, featureKey: string, cost: number) {
  const sub = await prisma.subscription.findUnique({ where: { userEmail } });
  if (!sub) return;
  const refundToIncluded = Math.min(sub.includedCreditsUsed, cost);
  const refundToPurchased = cost - refundToIncluded;
  await prisma.subscription.update({
    where: { userEmail },
    data: {
      ...(refundToIncluded > 0 ? { includedCreditsUsed: { decrement: refundToIncluded } } : {}),
      ...(refundToPurchased > 0 ? { purchasedCredits: { increment: refundToPurchased } } : {}),
    },
  });
  await prisma.creditLedger.create({
    data: { userEmail, featureKey, amount: cost, reason: "refund_failure" },
  });
}

// Al iniciar un nuevo ciclo de facturación: los incluidos se renuevan (no se acumulan)
export async function resetCycleCredits(userEmail: string) {
  await prisma.subscription.update({
    where: { userEmail },
    data: { includedCreditsUsed: 0 },
  });
  await prisma.creditLedger.create({
    data: { userEmail, amount: 0, reason: "cycle_reset" },
  });
}
