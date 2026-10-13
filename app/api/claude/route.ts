import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/claude";
import { unauthorized } from "@/lib/apiAuth";
import { getScope, billingEmail } from "@/lib/center";
import { checkCreditAlert } from "@/lib/creditAlerts";
import { getBillingStatus, hasFullAccess, featureAllowed, consumeCredits, refundCredits } from "@/lib/billing";

export async function POST(req: NextRequest) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  const bolsa = billingEmail(scope);
  try {
    const { prompt, systemPrompt, featureKey } = await req.json();

    // Facturación: acceso por plan y saldo de créditos (los admin no pagan)
    const key = featureKey || "ai_ideas_actividades";
    if (scope.platformAdmin) {
      const text = await askClaude(prompt, { systemPrompt, maxTokens: 2048 });
      return NextResponse.json({ text, creditsUsed: 0 });
    }
    const billing = await getBillingStatus(bolsa);
    if (!hasFullAccess(billing.effectiveStatus)) {
      return NextResponse.json(
        {
          error: scope.centerId && !scope.isAdmin
            ? "La suscripción del Centro está pendiente. Avísale a la Administradora."
            : "Tu período de prueba terminó. Elige un plan para seguir usando la IA.",
          code: "subscription_expired",
        },
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
    const ok = await consumeCredits(bolsa, key, feature.cost, scope.email);
    if (!ok) {
      return NextResponse.json(
        {
          error: scope.centerId && !scope.isAdmin
            ? "Al Centro no le quedan créditos de IA este ciclo. Avísale a la Administradora para que recargue."
            : "No te quedan créditos de IA este ciclo. Puedes comprar una recarga o esperar la renovación.",
          code: "no_credits",
        },
        { status: 402 }
      );
    }

    try {
      const text = await askClaude(prompt, {
        systemPrompt,
        maxTokens: 2048,
      });
      // Aviso del 20 % y del agotamiento: a la terapeuta, o a la Administradora
      checkCreditAlert(bolsa).catch((err) => console.error("[credits] aviso falló:", err));
      return NextResponse.json({ text, creditsUsed: feature.cost });
    } catch (error) {
      // Si la generación falla, los créditos vuelven solos
      await refundCredits(bolsa, key, feature.cost, scope.email);
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
