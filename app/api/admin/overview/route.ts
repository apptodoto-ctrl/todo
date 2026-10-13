import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/adminPanel";

/** Lo primero que ve el equipo al entrar al panel: el pulso del negocio */
export async function GET() {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const ahora = new Date();
  const hace7 = new Date(ahora); hace7.setDate(ahora.getDate() - 7);
  const hace30 = new Date(ahora); hace30.setDate(ahora.getDate() - 30);
  const hace14 = new Date(ahora); hace14.setDate(ahora.getDate() - 14);
  const en7 = new Date(ahora); en7.setDate(ahora.getDate() + 7);
  const mes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;

  const [subs, users, centros, nuevas7, nuevas30, citasMes, consultas] = await Promise.all([
    prisma.subscription.findMany({ select: { accountState: true, status: true, tierCode: true, trialEndsAt: true, lastSeenAt: true, userEmail: true } }),
    prisma.user.findMany({ select: { email: true, country: true, createdAt: true } }),
    prisma.center.count(),
    prisma.user.count({ where: { createdAt: { gte: hace7 } } }),
    prisma.user.count({ where: { createdAt: { gte: hace30 } } }),
    prisma.appointment.count({ where: { date: { startsWith: mes } } }),
    prisma.supportTicket.count({ where: { state: { not: "resuelta" } } }),
  ]);

  const paisPor = new Map(users.map((u) => [u.email, u.country]));

  const porSituacion: Record<string, number> = {};
  const porPais: Record<string, number> = {};
  for (const s of subs) {
    const estado = s.accountState || s.status;
    porSituacion[estado] = (porSituacion[estado] ?? 0) + 1;
    const pais = paisPor.get(s.userEmail) ?? "OT";
    porPais[pais] = (porPais[pais] ?? 0) + 1;
  }

  const pruebasPorVencer = subs.filter(
    (s) => (s.accountState === "trial" || s.status === "trialing") && s.trialEndsAt && s.trialEndsAt <= en7 && s.trialEndsAt >= ahora
  ).length;

  const pagosPendientes = subs.filter((s) => (s.accountState || s.status) === "past_due").length;

  // Uso de IA del mes, en números
  const desdeMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const usoIA = await prisma.creditLedger.aggregate({
    where: { reason: "consume", createdAt: { gte: desdeMes } },
    _sum: { amount: true },
  });

  // Cuentas que no entran hace más de dos semanas
  const dormidas = subs.filter((s) => !s.lastSeenAt || s.lastSeenAt < hace14).length;

  return NextResponse.json({
    cuentas: { total: users.length, centros, individuales: users.length - centros },
    porSituacion,
    porPais,
    nuevas: { ultimos7: nuevas7, ultimos30: nuevas30 },
    pruebasPorVencer,
    pagosPendientes,
    consultasSinResolver: consultas,
    citasAgendadasMes: citasMes,
    creditosUsadosMes: Math.abs(usoIA._sum.amount ?? 0),
    cuentasDormidas: dormidas,
  });
}
