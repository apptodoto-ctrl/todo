import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";
import { getBillingStatus, hasFullAccess } from "@/lib/billing";

export async function GET() {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const patients = await prisma.patient.findMany({
      where: { createdBy: session.email },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(patients);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    // Tope de pacientes según el escalón: bloquea crear nuevos y ofrece el siguiente.
    // Nunca oculta ni archiva los existentes. Los admin no tienen tope.
    if (session.role === "admin") {
      const body = await req.json();
      const patient = await prisma.patient.create({ data: { ...body, createdBy: session.email } });
      return NextResponse.json(patient, { status: 201 });
    }
    const billing = await getBillingStatus(session.email);
    if (!hasFullAccess(billing.effectiveStatus)) {
      return NextResponse.json(
        { error: "Tu período de prueba terminó. Elige un plan para crear nuevos usuarios (los existentes siguen visibles).", code: "subscription_expired" },
        { status: 402 }
      );
    }
    if (billing.maxPatients !== null) {
      const count = await prisma.patient.count({ where: { createdBy: session.email } });
      if (count >= billing.maxPatients) {
        const nextTier = await prisma.planTier.findFirst({
          where: {
            active: true,
            isAddon: false,
            OR: [{ maxPatients: null }, { maxPatients: { gt: billing.maxPatients } }],
          },
          orderBy: { sortOrder: "asc" },
        });
        return NextResponse.json(
          {
            error: `Alcanzaste el tope de ${billing.maxPatients} pacientes de tu plan.${nextTier ? ` El siguiente escalón (${nextTier.code}) permite ${nextTier.maxPatients ?? "pacientes sin tope"} por $${nextTier.priceMonthly}/mes.` : ""}`,
            code: "patient_limit",
            nextTier: nextTier?.code ?? null,
          },
          { status: 402 }
        );
      }
    }
    const body = await req.json();
    const patient = await prisma.patient.create({
      data: { ...body, createdBy: session.email },
    });
    return NextResponse.json(patient, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
