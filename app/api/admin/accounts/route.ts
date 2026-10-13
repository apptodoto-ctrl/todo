import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/adminPanel";

/**
 * Lista de todas las cuentas: individuales y Centros, con su plan, su
 * situación y sus créditos. Nunca devuelve información de pacientes.
 */
export async function GET(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const estado = req.nextUrl.searchParams.get("state") ?? "";
  const tipo = req.nextUrl.searchParams.get("type") ?? "";
  const pais = req.nextUrl.searchParams.get("country") ?? "";

  const [users, subs, centers, members, patientCounts] = await Promise.all([
    prisma.user.findMany({ select: { email: true, name: true, country: true, currency: true, createdAt: true, phone: true } }),
    prisma.subscription.findMany(),
    prisma.center.findMany({ select: { id: true, name: true, adminEmail: true, seats: true, extraSeats: true } }),
    prisma.centerMember.findMany({ where: { active: true }, select: { userEmail: true, centerId: true, role: true } }),
    prisma.patient.groupBy({ by: ["createdBy"], _count: true }),
  ]);

  const subPor = new Map(subs.map((s) => [s.userEmail, s]));
  const centroPorAdmin = new Map(centers.map((c) => [c.adminEmail, c]));
  const miembroPor = new Map(members.map((m) => [m.userEmail, m]));
  const pacientesPor = new Map(patientCounts.map((p) => [p.createdBy, p._count]));

  let filas = users.map((u) => {
    const sub = subPor.get(u.email);
    const centro = centroPorAdmin.get(u.email);
    const miembro = miembroPor.get(u.email);
    const esSubcuenta = !!miembro && miembro.role === "terapeuta";
    return {
      email: u.email,
      name: u.name,
      country: u.country,
      currency: u.currency,
      phone: u.phone,
      createdAt: u.createdAt,
      type: centro ? "centro" : esSubcuenta ? "subcuenta" : "individual",
      centerName: centro?.name ?? (miembro ? centers.find((c) => c.id === miembro.centerId)?.name ?? "" : ""),
      seats: centro ? centro.seats + centro.extraSeats : null,
      tier: sub?.tierCode ?? null,
      state: sub?.accountState || sub?.status || (esSubcuenta ? "subcuenta" : "sin_suscripcion"),
      trialEndsAt: sub?.trialEndsAt ?? null,
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      betaGroup: sub?.betaGroup ?? "",
      credits: sub ? Math.max(0, sub.purchasedCredits) : 0,
      lastSeenAt: sub?.lastSeenAt ?? null,
      patients: pacientesPor.get(u.email) ?? 0,
      tags: Array.isArray(sub?.tags) ? (sub!.tags as string[]) : [],
    };
  });

  if (q) {
    filas = filas.filter((f) =>
      f.email.toLowerCase().includes(q) ||
      f.name.toLowerCase().includes(q) ||
      f.centerName.toLowerCase().includes(q) ||
      f.phone.toLowerCase().includes(q)
    );
  }
  if (estado) filas = filas.filter((f) => f.state === estado);
  if (tipo) filas = filas.filter((f) => f.type === tipo);
  if (pais) filas = filas.filter((f) => f.country === pais);

  filas.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return NextResponse.json(filas);
}
