import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = Promise<{ id: string }>;

async function syncSessionCount(patientId: number) {
  const count = await prisma.sessionRecord.count({ where: { patientId } });
  await prisma.patient.update({ where: { id: patientId }, data: { sessions: count } });
  return count;
}

export async function GET(_: Request, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const records = await prisma.sessionRecord.findMany({
      where: { patientId: Number(id) },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    });
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const patientId = Number(id);
    const { date, notes, therapist, createdBy } = await req.json();
    if (!date) {
      return NextResponse.json({ error: "La fecha es requerida" }, { status: 400 });
    }
    const record = await prisma.sessionRecord.create({
      data: { patientId, date, notes: notes || "", therapist: therapist || "", createdBy: createdBy || "" },
    });
    const sessions = await syncSessionCount(patientId);
    return NextResponse.json({ ...record, sessions }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
