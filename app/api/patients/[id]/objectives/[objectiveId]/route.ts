import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, loadPatient } from "@/lib/center";

type Params = Promise<{ id: string; objectiveId: string }>;

async function checkOwnership(patientId: number) {
  // El acceso lo decide el alcance: cuenta individual o Centro con permisos
  const scope = await getScope();
  if (!scope) return unauthorized();
  const { status } = await loadPatient(scope, patientId);
  if (status === 404) return notFound();
  if (status === 403) return forbidden();
  return null;
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id, objectiveId } = await params;
    const err = await checkOwnership(Number(id));
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
    const err = await checkOwnership(Number(id));
    if (err) return err;
    await prisma.objective.delete({ where: { id: Number(objectiveId) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
