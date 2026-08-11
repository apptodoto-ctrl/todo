import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";

type Params = Promise<{ id: string }>;

async function ownedPatient(id: number, email: string) {
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) return { error: notFound() };
  if (patient.createdBy !== email) return { error: forbidden() };
  return { patient };
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const check = await ownedPatient(Number(id), session.email);
    if ("error" in check) return check.error;
    const body = await req.json();
    delete body.createdBy;
    delete body.id;
    const patient = await prisma.patient.update({ where: { id: Number(id) }, data: body });
    return NextResponse.json(patient);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const check = await ownedPatient(Number(id), session.email);
    if ("error" in check) return check.error;
    await prisma.patient.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar: el usuario tiene registros asociados" }, { status: 500 });
  }
}
