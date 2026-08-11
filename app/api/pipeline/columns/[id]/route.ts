import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";

type Params = Promise<{ id: string }>;

async function checkOwnership(id: string, email: string) {
  const column = await prisma.pipelineColumn.findUnique({
    where: { id },
    include: { pipeline: true },
  });
  if (!column) return notFound();
  if (!column.pipeline || column.pipeline.createdBy !== email) return forbidden();
  return null;
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const err = await checkOwnership(id, session.email);
    if (err) return err;
    const body = await req.json();
    delete body.id;
    delete body.pipelineId;
    const column = await prisma.pipelineColumn.update({
      where: { id },
      data: body,
      include: { cases: true },
    });
    return NextResponse.json(column);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const err = await checkOwnership(id, session.email);
    if (err) return err;
    await prisma.pipelineColumn.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
