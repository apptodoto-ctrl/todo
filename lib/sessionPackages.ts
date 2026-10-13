import { prisma } from "@/lib/db";

export interface PackageSummary {
  id: number;
  patientId: number;
  patientName: string;
  name: string;
  totalSessions: number;
  usedSessions: number;
  remaining: number;
  sessionValue: number;
  totalPrice: number;
  paid: boolean;
  startDate: string;
  expiresAt: string;
  status: string;
  expired: boolean;
  endingSoon: boolean;
  notes: string;
}

/** Quedan 2 o menos sesiones: hay que avisar que el paquete se acaba */
const ENDING_SOON = 2;

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isExpired(expiresAt: string): boolean {
  return !!expiresAt && expiresAt < today();
}

/**
 * Paquete vigente de un paciente: activo, con sesiones disponibles y dentro
 * de la vigencia. Se usa el más antiguo primero para que no caduquen.
 */
export async function activePackageFor(patientId: number) {
  const packages = await prisma.sessionPackage.findMany({
    where: { patientId, status: "activo" },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { sessions: true } } },
  });
  const hoy = today();
  return (
    packages.find(
      (p) =>
        p._count.sessions < p.totalSessions &&
        !isExpired(p.expiresAt) &&
        (!p.startDate || p.startDate <= hoy)
    ) ?? null
  );
}

/** Recalcula si un paquete sigue activo o ya se agotó */
export async function refreshPackageStatus(packageId: number): Promise<void> {
  const pkg = await prisma.sessionPackage.findUnique({
    where: { id: packageId },
    include: { _count: { select: { sessions: true } } },
  });
  if (!pkg || pkg.status === "cerrado") return;
  const next = pkg._count.sessions >= pkg.totalSessions ? "agotado" : "activo";
  if (next !== pkg.status) {
    await prisma.sessionPackage.update({ where: { id: pkg.id }, data: { status: next } });
  }
}

/**
 * Engancha al paquete las sesiones que el paciente ya tenía dentro de su
 * vigencia. Un paquete se suele cargar después de haber atendido algunas
 * sesiones, y esas también se descuentan: lo que manda es la fecha de
 * inicio del paquete, no el día en que se creó en el sistema.
 */
export async function absorbExistingSessions(packageId: number): Promise<number> {
  const pkg = await prisma.sessionPackage.findUnique({
    where: { id: packageId },
    include: { _count: { select: { sessions: true } } },
  });
  if (!pkg) return 0;

  const free = pkg.totalSessions - pkg._count.sessions;
  if (free <= 0) return 0;

  // Un solo filtro de fecha: dos claves "date" separadas se pisan entre sí
  const dateRange = {
    ...(pkg.startDate ? { gte: pkg.startDate } : {}),
    ...(pkg.expiresAt ? { lte: pkg.expiresAt } : {}),
  };

  const candidates = await prisma.sessionRecord.findMany({
    where: {
      patientId: pkg.patientId,
      packageId: null,
      attended: true,
      ...(Object.keys(dateRange).length > 0 ? { date: dateRange } : {}),
    },
    orderBy: [{ date: "asc" }, { id: "asc" }],
    take: free,
    select: { id: true },
  });
  if (candidates.length === 0) return 0;

  await prisma.sessionRecord.updateMany({
    where: { id: { in: candidates.map((c) => c.id) } },
    data: { packageId: pkg.id, ...(pkg.paid ? { paid: true } : {}) },
  });

  if (pkg._count.sessions + candidates.length >= pkg.totalSessions) {
    await prisma.sessionPackage.update({ where: { id: pkg.id }, data: { status: "agotado" } });
  }
  return candidates.length;
}

/**
 * Descuenta una sesión del paquete vigente del paciente. Si el paquete ya
 * estaba pagado, la sesión queda cobrada. Devuelve el paquete usado.
 */
export async function consumeFromPackage(sessionId: number, patientId: number) {
  const pkg = await activePackageFor(patientId);
  if (!pkg) return null;

  await prisma.sessionRecord.update({
    where: { id: sessionId },
    data: { packageId: pkg.id, ...(pkg.paid ? { paid: true } : {}) },
  });

  // Si con esta sesión se completa el paquete, queda agotado
  if (pkg._count.sessions + 1 >= pkg.totalSessions) {
    await prisma.sessionPackage.update({ where: { id: pkg.id }, data: { status: "agotado" } });
  }
  return pkg;
}

export function summarize(
  pkg: { id: number; patientId: number; name: string; totalSessions: number; sessionValue: number; totalPrice: number; paid: boolean; startDate: string; expiresAt: string; status: string; notes: string; _count: { sessions: number } },
  patientName: string
): PackageSummary {
  const used = pkg._count.sessions;
  const remaining = Math.max(0, pkg.totalSessions - used);
  const expired = isExpired(pkg.expiresAt);
  return {
    id: pkg.id,
    patientId: pkg.patientId,
    patientName,
    name: pkg.name,
    totalSessions: pkg.totalSessions,
    usedSessions: used,
    remaining,
    sessionValue: pkg.sessionValue,
    totalPrice: pkg.totalPrice,
    paid: pkg.paid,
    startDate: pkg.startDate,
    expiresAt: pkg.expiresAt,
    status: expired && pkg.status === "activo" ? "vencido" : pkg.status,
    expired,
    endingSoon: pkg.status === "activo" && !expired && remaining > 0 && remaining <= ENDING_SOON,
    notes: pkg.notes,
  };
}

/** Todos los paquetes de la terapeuta, con el consumo ya calculado */
export async function packagesFor(email: string, patientId?: number): Promise<PackageSummary[]> {
  const packages = await prisma.sessionPackage.findMany({
    where: { createdBy: email, ...(patientId ? { patientId } : {}) },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { sessions: true } }, patient: { select: { name: true } } },
  });
  return packages.map((p) => summarize(p, p.patient.name));
}
