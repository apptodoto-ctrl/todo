import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, ownScope } from "@/lib/center";

type Params = Promise<{ id: string }>;

/** Dentro de un Centro, la Administradora alcanza lo de todo su equipo */
async function checkOwnership(id: number) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  const task = await prisma.task.findFirst({ where: { id, ...ownScope(scope) } });
  if (task) return null;
  const existe = await prisma.task.findUnique({ where: { id } });
  return existe ? forbidden() : notFound();
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id } = await params;
    const err = await checkOwnership(Number(id));
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
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id } = await params;
    const err = await checkOwnership(Number(id));
    if (err) return err;
    await prisma.task.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
