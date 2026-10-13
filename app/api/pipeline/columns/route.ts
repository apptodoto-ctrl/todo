import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, ownScope } from "@/lib/center";

/** ¿Este pipeline está al alcance de quien pide? */
async function esDelAlcance(pipelineId: string) {
  const scope = await getScope();
  if (!scope) return false;
  return !!(await prisma.pipeline.findFirst({ where: { id: pipelineId, ...ownScope(scope) } }));
}

export async function GET(req: Request) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { searchParams } = new URL(req.url);
    const pipelineId = searchParams.get("pipelineId");
    const columns = await prisma.pipelineColumn.findMany({
      where: {
        ...(pipelineId ? { pipelineId } : {}),
        pipeline: ownScope(scope),
      },
      include: { cases: { orderBy: { createdAt: "asc" } } },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(columns);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const body = await req.json();
    if (!body.pipelineId) {
      return NextResponse.json({ error: "pipelineId requerido" }, { status: 400 });
    }
    const pipeline = await prisma.pipeline.findUnique({ where: { id: body.pipelineId } });
    if (!pipeline) return notFound();
    if (!(await esDelAlcance(pipeline.id))) return forbidden();
    const count = await prisma.pipelineColumn.count({ where: { pipelineId: body.pipelineId } });
    const column = await prisma.pipelineColumn.create({
      data: { ...body, order: count },
      include: { cases: true },
    });
    return NextResponse.json(column, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
