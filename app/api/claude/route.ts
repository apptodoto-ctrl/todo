import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/claude";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";
import { getBillingStatus, hasFullAccess, featureAllowed, consumeCredits, refundCredits } from "@/lib/billing";

export async function POST(req: NextRequest) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { prompt, systemPrompt, featureKey } = await req.json();

    // Facturación: acceso por plan y saldo de créditos (los admin no pagan)
    const key = featureKey || "ai_ideas_actividades";
    if (session.role === "admin") {
      const text = await askClaude(prompt, { systemPrompt, maxTokens: 2048 });
      return NextResponse.json({ text, creditsUsed: 0 });
    }
    const billing = await getBillingStatus(session.email);
    if (!hasFullAccess(billing.effectiveStatus)) {
      return NextResponse.json(
        { error: "Tu período de prueba terminó. Elige un plan para seguir usando la IA.", code: "subscription_expired" },
        { status: 402 }
      );
    }
    const feature = await featureAllowed(billing.subscription.tierCode, billing.subscription.status === "trialing", key);
    if (!feature.allowed) {
      return NextResponse.json(
        { error: `Tu plan no incluye "${feature.name}". Súbete a Profesional para usarla.`, code: "feature_not_in_plan" },
        { status: 403 }
      );
    }
    const ok = await consumeCredits(session.email, key, feature.cost);
    if (!ok) {
      return NextResponse.json(
        { error: "No te quedan créditos de IA este ciclo. Puedes comprar una recarga o esperar la renovación.", code: "no_credits" },
        { status: 402 }
      );
    }

    try {
      const text = await askClaude(prompt, {
        systemPrompt,
        maxTokens: 2048,
      });
      return NextResponse.json({ text, creditsUsed: feature.cost });
    } catch (error) {
      // Si la generación falla, los créditos vuelven solos
      await refundCredits(session.email, key, feature.cost);
      throw error;
    }
  } catch (error) {
    console.error("Claude API error:", error);
    return NextResponse.json(
      { error: "Error al conectar con Claude. Verifica la API key." },
      { status: 500 }
    );
  }
}
