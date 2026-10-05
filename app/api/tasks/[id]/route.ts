import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";

type Params = Promise<{ id: string }>;

async function checkOwnership(id: number, email: string) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return notFound();
  if (task.createdBy !== email) return forbidden();
  return null;
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const err = await checkOwnership(Number(id), session.email);
    if (err) return err;
    const body = await req.json();
    const { patient, patientId, ...rest } = body;
    delete rest.createdBy;
    delete rest.id;
    delete rest.notifiedAt;
    // Si cambia la fecha, la hora o se reactiva el aviso, vuelve a quedar pendiente de notificar
    const reschedules = rest.due !== undefined || rest.time !== undefined || rest.notify !== undefined;
    const task = await prisma.task.update({
      where: { id: Number(id) },
      data: {
        ...rest,
        ...(patient !== undefined ? { patientName: patient } : {}),
        ...(patientId ? { patientId: Number(patientId) } : {}),
        ...(reschedules ? { notifiedAt: null } : {}),
      },
    });
    return NextResponse.json({ ...task, patient: task.patientName });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const err = await checkOwnership(Number(id), session.email);
    if (err) return err;
    await prisma.task.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
