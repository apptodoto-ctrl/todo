import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";

export async function GET(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { searchParams } = new URL(req.url);
    const pipelineId = searchParams.get("pipelineId");
    const columns = await prisma.pipelineColumn.findMany({
      where: {
        ...(pipelineId ? { pipelineId } : {}),
        pipeline: { createdBy: session.email },
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
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const body = await req.json();
    if (!body.pipelineId) {
      return NextResponse.json({ error: "pipelineId requerido" }, { status: 400 });
    }
    const pipeline = await prisma.pipeline.findUnique({ where: { id: body.pipelineId } });
    if (!pipeline) return notFound();
    if (pipeline.createdBy !== session.email) return forbidden();
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
