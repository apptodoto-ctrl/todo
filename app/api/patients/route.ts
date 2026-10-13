import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized } from "@/lib/apiAuth";
import { getBillingStatus, hasFullAccess } from "@/lib/billing";
import { getScope, patientScope, ownerFields, billingEmail, can } from "@/lib/center";

export async function GET() {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const patients = await prisma.patient.findMany({
      where: patientScope(scope),
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(patients);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const scope = await getScope();
  if (!scope) return unauthorized();

  // En un Centro, crear pacientes es un permiso que decide la Administradora
  if (scope.centerId && !can(scope, "crearPacientes")) {
    return NextResponse.json(
      { error: "Tu Centro no te permite crear pacientes nuevos. Pídeselo a la Administradora." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    // La terapeuta a cargo es quien lo crea, salvo que se indique otra
    const base = {
      ...body,
      ...ownerFields(scope),
      therapistEmail: String(body.therapistEmail || scope.email),
    };

    // El equipo de TOdo no pasa por facturación
    if (scope.platformAdmin) {
      const patient = await prisma.patient.create({ data: base });
      return NextResponse.json(patient, { status: 201 });
    }

    const billing = await getBillingStatus(billingEmail(scope));
    if (!hasFullAccess(billing.effectiveStatus)) {
      return NextResponse.json(
        {
          error: scope.centerId && !scope.isAdmin
            ? "La suscripción del Centro está pendiente. Avísale a la Administradora."
            : "Tu período de prueba terminó. Elige un plan para crear nuevos usuarios (los existentes siguen visibles).",
          code: "subscription_expired",
        },
        { status: 402 }
      );
    }

    // El tope de pacientes se cuenta sobre todo el Centro, no por terapeuta
    if (billing.maxPatients !== null) {
      const count = await prisma.patient.count({
        where: scope.centerId ? { centerId: scope.centerId } : { createdBy: scope.email },
      });
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
            error: `Alcanzaste el tope de ${billing.maxPatients} pacientes del plan.${nextTier ? ` El siguiente escalón (${nextTier.code}) permite ${nextTier.maxPatients ?? "pacientes sin tope"} por USD ${nextTier.priceMonthly}/mes.` : ""}`,
            code: "patient_limit",
            nextTier: nextTier?.code ?? null,
          },
          { status: 402 }
        );
      }
    }

    const patient = await prisma.patient.create({ data: base });
    return NextResponse.json(patient, { status: 201 });
  } catch (err) {
    console.error("Patient create error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
