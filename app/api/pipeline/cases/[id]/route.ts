import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";

type Params = Promise<{ id: string }>;

async function checkOwnership(id: number, email: string) {
  const c = await prisma.pipelineCase.findUnique({
    where: { id },
    include: { column: { include: { pipeline: true } } },
  });
  if (!c) return notFound();
  if (!c.column.pipeline || c.column.pipeline.createdBy !== email) return forbidden();
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
    if (body.columnId) {
      const target = await prisma.pipelineColumn.findUnique({
        where: { id: body.columnId },
        include: { pipeline: true },
      });
      if (!target || !target.pipeline || target.pipeline.createdBy !== session.email) return forbidden();
    }
    const updated = await prisma.pipelineCase.update({
      where: { id: Number(id) },
      data: body,
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
    await prisma.pipelineCase.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
