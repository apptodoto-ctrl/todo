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

export async function GET(_: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const patientId = Number(id);
    const err = await checkOwnership(patientId, session.email);
    if (err) return err;
    const objectives = await prisma.objective.findMany({
      where: { patientId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(objectives);
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
    const { title } = await req.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "El objetivo es requerido" }, { status: 400 });
    }
    const objective = await prisma.objective.create({
      data: { patientId, title: title.trim() },
    });
    return NextResponse.json(objective, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
