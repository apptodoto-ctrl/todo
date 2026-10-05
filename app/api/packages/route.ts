import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { packagesFor } from "@/lib/sessionPackages";

export async function GET(req: NextRequest) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const patientParam = req.nextUrl.searchParams.get("patientId");
    const list = await packagesFor(session.email, patientParam ? Number(patientParam) : undefined);
    return NextResponse.json(list);
  } catch (err) {
    console.error("Packages list error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const body = await req.json();
    const patientId = Number(body.patientId);
    const totalSessions = Number(body.totalSessions);
    if (!patientId) return NextResponse.json({ error: "Elige el usuario del paquete" }, { status: 400 });
    if (!Number.isInteger(totalSessions) || totalSessions < 1 || totalSessions > 200) {
      return NextResponse.json({ error: "El paquete debe tener entre 1 y 200 sesiones" }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return notFound();
    if (patient.createdBy !== session.email) return forbidden();

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
        startDate: String(body.startDate || ""),
        expiresAt: String(body.expiresAt || ""),
        notes: String(body.notes || "").slice(0, 500),
        createdBy: session.email,
      },
    });
    return NextResponse.json(pkg, { status: 201 });
  } catch (err) {
    console.error("Package create error:", err);
    return NextResponse.json({ error: "No se pudo crear el paquete" }, { status: 500 });
  }
}
