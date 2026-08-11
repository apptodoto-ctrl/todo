import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";

type Params = Promise<{ id: string }>;

async function checkOwnership(id: number, email: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) return notFound();
  if (appointment.createdBy !== email) return forbidden();
  return null;
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const err = await checkOwnership(Number(id), session.email);
    if (err) return err;
    const body = await req.json();
    const updated = await prisma.appointment.update({
      where: { id: Number(id) },
      data: {
        title: body.title,
        date: body.date,
        time: body.time,
        type: body.type,
        location: body.location,
      },
    });
    return NextResponse.json(updated);
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
    await prisma.appointment.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
