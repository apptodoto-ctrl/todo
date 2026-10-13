import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, ownScope } from "@/lib/center";

type Params = Promise<{ id: string }>;

/** ¿Este pipeline está al alcance de quien pide? */
async function esDelAlcance(pipelineId: string) {
  const scope = await getScope();
  if (!scope) return false;
  return !!(await prisma.pipeline.findFirst({ where: { id: pipelineId, ...ownScope(scope) } }));
}

async function checkOwnership(id: string) {
  const column = await prisma.pipelineColumn.findUnique({
    where: { id },
    include: { pipeline: true },
  });
  if (!column) return notFound();
  if (!column.pipeline || !(await esDelAlcance(column.pipeline.id))) return forbidden();
  return null;
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id } = await params;
    const err = await checkOwnership(id);
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
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id } = await params;
    const err = await checkOwnership(id);
    if (err) return err;
    await prisma.pipelineColumn.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
