import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";

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
    const { date, notes } = await req.json();
    if (!date) {
      return NextResponse.json({ error: "La fecha es requerida" }, { status: 400 });
    }
    const record = await prisma.sessionRecord.create({
      data: { patientId, date, notes: notes || "", therapist: session.name, createdBy: session.email },
    });
    const sessions = await syncSessionCount(patientId);
    return NextResponse.json({ ...record, sessions }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
