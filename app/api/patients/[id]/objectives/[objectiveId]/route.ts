import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";

type Params = Promise<{ id: string; objectiveId: string }>;

async function checkOwnership(patientId: number, email: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return notFound();
  if (patient.createdBy !== email) return forbidden();
  return null;
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id, objectiveId } = await params;
    const err = await checkOwnership(Number(id), session.email);
    if (err) return err;
    const { title, status, progress } = await req.json();
    const objective = await prisma.objective.update({
      where: { id: Number(objectiveId) },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(progress !== undefined ? { progress: Math.max(0, Math.min(100, Number(progress))) } : {}),
      },
    });
    return NextResponse.json(objective);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id, objectiveId } = await params;
    const err = await checkOwnership(Number(id), session.email);
    if (err) return err;
    await prisma.objective.delete({ where: { id: Number(objectiveId) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
