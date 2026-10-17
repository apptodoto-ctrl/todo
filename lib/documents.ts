import { prisma } from "@/lib/db";
import { ownScope, type Scope } from "@/lib/center";

/**
 * Qué documentos puede ver quien pregunta: los suyos y, en un Centro, los
 * que la Administradora etiquetó con alguna de sus especialidades.
 */
export async function documentScope(scope: Scope) {
  if (!scope.centerId || scope.isAdmin) return ownScope(scope);
  const member = await prisma.centerMember.findFirst({
    where: { centerId: scope.centerId, userEmail: scope.email, active: true },
    select: { specialties: true },
  });
  const mias = member?.specialties ?? [];
  if (mias.length === 0) return ownScope(scope);
  return { OR: [ownScope(scope), { centerId: scope.centerId, patientId: null, specialties: { hasSome: mias } }] };
}

/** Limpia una lista de etiquetas: sin vacíos, sin repetidos, con tope */
export function cleanTags(raw: unknown, max = 30): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const out: string[] = [];
  for (const t of list) {
    const v = String(t).trim().slice(0, 40);
    if (v && !out.some((o) => o.toLowerCase() === v.toLowerCase())) out.push(v);
  }
  return out.slice(0, max);
}
