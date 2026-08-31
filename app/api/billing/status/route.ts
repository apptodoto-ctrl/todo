import { NextResponse } from "next/server";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";
import { getBillingStatus, getSetting } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { stripeEnabled } from "@/lib/stripe";

export async function GET() {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const status = await getBillingStatus(session.email);
    const [tiers, packs, features] = await Promise.all([
      prisma.planTier.findMany({ where: { active: true, isAddon: false }, orderBy: { sortOrder: "asc" } }),
      prisma.creditPack.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
      prisma.aiFeature.findMany({ where: { active: true }, orderBy: { creditCost: "asc" } }),
    ]);
    const warningPct = Number(await getSetting("credits_warning_pct", "80"));
    return NextResponse.json({
      plan: status.planName,
      tierCode: status.subscription.tierCode,
      status: status.effectiveStatus,
      billingCycle: status.subscription.billingCycle,
      trialEndsAt: status.subscription.trialEndsAt,
      currentPeriodEnd: status.subscription.currentPeriodEnd,
      credits: {
        includedTotal: status.includedTotal,
        includedRemaining: status.includedRemaining,
        purchased: status.purchased,
        totalRemaining: status.totalRemaining,
        warningPct,
      },
      maxPatients: status.maxPatients,
      stripeEnabled: stripeEnabled(),
      hasStripeSubscription: !!status.subscription.stripeSubscriptionId,
      tiers,
      packs,
      features,
    });
  } catch (err) {
    console.error("Billing status error:", err);
    return NextResponse.json({ error: "Error de facturación" }, { status: 500 });
  }
}
