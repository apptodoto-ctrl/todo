import { prisma } from "@/lib/db";
import { getSessionInfo } from "@/lib/apiAuth";

/** Situaciones en las que puede estar una cuenta */
export const ACCOUNT_STATES = [
  "trial", "beta", "active", "past_due", "solo_lectura", "suspendida", "cancelada", "comp",
] as const;

export type AccountState = (typeof ACCOUNT_STATES)[number];

export const STATE_LABELS: Record<string, string> = {
  trial: "Prueba gratis",
  beta: "Beta tester",
  active: "Activa",
  past_due: "Pago pendiente",
  solo_lectura: "Solo lectura",
  suspendida: "Suspendida",
  cancelada: "Cancelada",
  comp: "Cortesía",
  sin_suscripcion: "Sin plan aún",
  subcuenta: "Subcuenta del Centro",
};

/** Qué puede hacer una cuenta en cada situación */
export const STATE_RULES: Record<string, { entrar: boolean; editar: boolean; cobra: boolean }> = {
  trial: { entrar: true, editar: true, cobra: false },
  beta: { entrar: true, editar: true, cobra: false },
  active: { entrar: true, editar: true, cobra: true },
  past_due: { entrar: true, editar: true, cobra: true },
  solo_lectura: { entrar: true, editar: false, cobra: false },
  suspendida: { entrar: false, editar: false, cobra: false },
  cancelada: { entrar: false, editar: false, cobra: false },
  comp: { entrar: true, editar: true, cobra: false },
};

/** Días que se guardan los datos de una cuenta cancelada */
export const RETENTION_DAYS = 90;

/** Cambios que obligan a escribir un motivo */
const NEEDS_REASON = new Set([
  "cambiar_plan", "cambiar_precio", "ajustar_creditos", "devolver_dinero",
  "cambiar_estado", "borrar_cuenta", "regalar_meses",
]);

export function requiresReason(action: string): boolean {
  return NEEDS_REASON.has(action);
}

/** ¿Es una cuenta del equipo de TOdo? */
export async function requireStaff(): Promise<{ email: string; name: string } | null> {
  const session = await getSessionInfo();
  if (!session || session.role !== "admin") return null;
  return { email: session.email, name: session.name };
}

/**
 * Anota en el registro lo que se hizo: quién, sobre quién, cómo estaba,
 * cómo quedó y por qué. Nadie puede borrarlo ni editarlo desde el panel.
 */
export async function audit(params: {
  actor: string;
  targetEmail?: string;
  action: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      actor: params.actor,
      targetEmail: params.targetEmail ?? "",
      action: params.action,
      before: (params.before ?? null) as never,
      after: (params.after ?? null) as never,
      reason: params.reason ?? "",
    },
  });
}
