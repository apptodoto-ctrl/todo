import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";

type Params = Promise<{ id: string }>;

async function checkOwnership(id: number, email: string) {
  const reminder = await prisma.reminder.findUnique({ where: { id } });
  if (!reminder) return notFound();
  if (reminder.createdBy !== email) return forbidden();
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
    delete body.id;
    delete body.createdBy;
    const reminder = await prisma.reminder.update({ where: { id: Number(id) }, data: body });
    return NextResponse.json(reminder);
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
    await prisma.reminder.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
