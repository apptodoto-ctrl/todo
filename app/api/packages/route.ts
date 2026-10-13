import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, loadPatient, ownerFields } from "@/lib/center";
import { packagesFor, absorbExistingSessions, today } from "@/lib/sessionPackages";

export async function GET(req: NextRequest) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const patientParam = req.nextUrl.searchParams.get("patientId");
    const list = await packagesFor(scope, patientParam ? Number(patientParam) : undefined);
    return NextResponse.json(list);
  } catch (err) {
    console.error("Packages list error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const body = await req.json();
    const patientId = Number(body.patientId);
    const totalSessions = Number(body.totalSessions);
    if (!patientId) return NextResponse.json({ error: "Elige el usuario del paquete" }, { status: 400 });
    if (!Number.isInteger(totalSessions) || totalSessions < 1 || totalSessions > 200) {
      return NextResponse.json({ error: "El paquete debe tener entre 1 y 200 sesiones" }, { status: 400 });
    }

    const { patient, status } = await loadPatient(scope, patientId);
    if (status === 404) return notFound();
    if (status === 403 || !patient) return forbidden();

    const sessionValue = Number(body.sessionValue) || patient.sessionValue || 0;
    const totalPrice = Number(body.totalPrice) || sessionValue * totalSessions;

    const pkg = await prisma.sessionPackage.create({
      data: {
        patientId,
        name: String(body.name || `Paquete de ${totalSessions} sesiones`).slice(0, 120),
        totalSessions,
        sessionValue,
        totalPrice,
        paid: body.paid === true,
        startDate: String(body.startDate || today()),
        expiresAt: String(body.expiresAt || ""),
        notes: String(body.notes || "").slice(0, 500),
        ...ownerFields(scope),
      },
    });
    // Las sesiones que el paciente ya tenía desde la fecha de inicio cuentan
    const absorbed = await absorbExistingSessions(pkg.id);
    return NextResponse.json({ ...pkg, absorbed }, { status: 201 });
  } catch (err) {
    console.error("Package create error:", err);
    return NextResponse.json({ error: "No se pudo crear el paquete" }, { status: 500 });
  }
}
