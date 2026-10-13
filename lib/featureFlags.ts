import { prisma } from "@/lib/db";

export interface FlagAudience {
  planes?: string[];
  paises?: string[];
  cuentas?: string[];
  soloBeta?: boolean;
}

/**
 * ¿Está encendida esta función para esta cuenta? Permite abrirla primero
 * a los beta testers, a un país o a unas cuentas concretas, y después a
 * todos, sin tocar el código.
 */
export async function flagEnabled(
  key: string,
  context: { email?: string; tierCode?: string; country?: string; isBeta?: boolean }
): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  if (!flag || !flag.enabled) return false;

  const audience = (flag.audience ?? {}) as FlagAudience;
  const sinPublico =
    !audience.planes?.length && !audience.paises?.length && !audience.cuentas?.length && !audience.soloBeta;
  if (sinPublico) return true;

  if (audience.cuentas?.length && context.email && audience.cuentas.includes(context.email)) return true;
  if (audience.soloBeta && context.isBeta) return true;
  if (audience.planes?.length && context.tierCode && audience.planes.includes(context.tierCode)) return true;
  if (audience.paises?.length && context.country && audience.paises.includes(context.country)) return true;

  return false;
}
