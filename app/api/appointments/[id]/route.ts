import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = Promise<{ id: string }>;

export async function PATCH(req: Request, { params }: { params: Params }) {
  try {
    const { id } = await params;
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
  try {
    const { id } = await params;
    await prisma.appointment.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
