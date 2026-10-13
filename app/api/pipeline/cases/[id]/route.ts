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

async function checkOwnership(id: number) {
  const c = await prisma.pipelineCase.findUnique({
    where: { id },
    include: { column: { include: { pipeline: true } } },
  });
  if (!c) return notFound();
  if (!c.column.pipeline || !(await esDelAlcance(c.column.pipeline.id))) return forbidden();
  return null;
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
    if (body.columnId) {
      const target = await prisma.pipelineColumn.findUnique({
        where: { id: body.columnId },
        include: { pipeline: true },
      });
      if (!target || !target.pipeline || !(await esDelAlcance(target.pipeline.id))) return forbidden();
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
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id } = await params;
    const err = await checkOwnership(Number(id));
    if (err) return err;
    await prisma.pipelineCase.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
