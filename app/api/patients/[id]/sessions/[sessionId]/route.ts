import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";

type Params = Promise<{ id: string; sessionId: string }>;

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

export async function PUT(req: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id, sessionId } = await params;
    const err = await checkOwnership(Number(id), session.email);
    if (err) return err;
    const { date, notes, duration, attended, paid } = await req.json();
    const record = await prisma.sessionRecord.update({
      where: { id: Number(sessionId) },
      data: {
        ...(date !== undefined ? { date } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(duration !== undefined ? { duration: Number(duration) } : {}),
        ...(attended !== undefined ? { attended: attended === true } : {}),
        ...(paid !== undefined ? { paid: paid === true } : {}),
      },
    });
    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id, sessionId } = await params;
    const patientId = Number(id);
    const err = await checkOwnership(patientId, session.email);
    if (err) return err;
    await prisma.sessionRecord.delete({ where: { id: Number(sessionId) } });
    const sessions = await syncSessionCount(patientId);
    return NextResponse.json({ ok: true, sessions });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
