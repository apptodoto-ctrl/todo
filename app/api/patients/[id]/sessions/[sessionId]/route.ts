import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = Promise<{ id: string; sessionId: string }>;

async function syncSessionCount(patientId: number) {
  const count = await prisma.sessionRecord.count({ where: { patientId } });
  await prisma.patient.update({ where: { id: patientId }, data: { sessions: count } });
  return count;
}

export async function PUT(req: Request, { params }: { params: Params }) {
  try {
    const { sessionId } = await params;
    const { date, notes, therapist } = await req.json();
    const record = await prisma.sessionRecord.update({
      where: { id: Number(sessionId) },
      data: {
        ...(date !== undefined ? { date } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(therapist !== undefined ? { therapist } : {}),
      },
    });
    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  try {
    const { id, sessionId } = await params;
    await prisma.sessionRecord.delete({ where: { id: Number(sessionId) } });
    const sessions = await syncSessionCount(Number(id));
    return NextResponse.json({ ok: true, sessions });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
