import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";

type Params = Promise<{ id: string }>;

async function owned(id: number, email: string) {
  const response = await prisma.formResponse.findUnique({ where: { id } });
  if (!response) return { error: notFound() };
  if (response.createdBy !== email) return { error: forbidden() };
  return { response };
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const { error } = await owned(Number(id), session.email);
    if (error) return error;
    const body = await req.json();
    const updated = await prisma.formResponse.update({
      where: { id: Number(id) },
      data: {
        ...(body.answers !== undefined ? { answers: body.answers as never } : {}),
        ...(body.title !== undefined ? { title: String(body.title).slice(0, 160) } : {}),
      },
      include: { template: { select: { name: true, sections: true } } },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la ficha" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const { error } = await owned(Number(id), session.email);
    if (error) return error;
    await prisma.formResponse.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
