import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { consumeFromPackage } from "@/lib/sessionPackages";

type Params = Promise<{ id: string }>;

async function checkOwnership(patientId: number, email: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return notFound();
  if (patient.createdBy !== email) return forbidden();
  return null;
}

async function syncSessionCount(patientId: number) {
  const count = await prisma.sessionRecord.count({ where: { patientId } });
  await prisma.patient.update({ where: { id: patientId }, data: { sessions: count } });
  return count;
}

export async function GET(_: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const patientId = Number(id);
    const err = await checkOwnership(patientId, session.email);
    if (err) return err;
    const records = await prisma.sessionRecord.findMany({
      where: { patientId },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    });
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const patientId = Number(id);
    const err = await checkOwnership(patientId, session.email);
    if (err) return err;
    const { date, notes, duration, attended, paid } = await req.json();
    if (!date) {
      return NextResponse.json({ error: "La fecha es requerida" }, { status: 400 });
    }
    const record = await prisma.sessionRecord.create({
      data: {
        patientId,
        date,
        notes: notes || "",
        therapist: session.name,
        createdBy: session.email,
        duration: duration ? Number(duration) : 45,
        attended: attended !== false,
        paid: paid === true,
      },
    });
    // Si el paciente tiene un paquete vigente, la sesión se descuenta de ahí
    let usedPackage = null;
    if (record.attended) {
      usedPackage = await consumeFromPackage(record.id, patientId);
    }
    const saved = usedPackage ? await prisma.sessionRecord.findUnique({ where: { id: record.id } }) : record;
    const sessions = await syncSessionCount(patientId);
    return NextResponse.json({ ...saved, sessions, usedPackage: usedPackage?.id ?? null }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
