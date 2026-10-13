import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, ownScope } from "@/lib/center";

type Params = Promise<{ id: string }>;

/** Dentro de un Centro, la Administradora alcanza lo de todo su equipo */
async function checkOwnership(id: number) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  const reminder = await prisma.reminder.findFirst({ where: { id, ...ownScope(scope) } });
  if (reminder) return null;
  const existe = await prisma.reminder.findUnique({ where: { id } });
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
    delete body.id;
    delete body.createdBy;
    const reminder = await prisma.reminder.update({ where: { id: Number(id) }, data: body });
    return NextResponse.json(reminder);
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
    await prisma.reminder.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
