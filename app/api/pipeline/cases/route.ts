import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";

export async function POST(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const body = await req.json();
    if (!body.columnId) {
      return NextResponse.json({ error: "columnId requerido" }, { status: 400 });
    }
    const column = await prisma.pipelineColumn.findUnique({
      where: { id: body.columnId },
      include: { pipeline: true },
    });
    if (!column) return notFound();
    if (!column.pipeline || column.pipeline.createdBy !== session.email) return forbidden();
    const c = await prisma.pipelineCase.create({ data: body });
    return NextResponse.json(c, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
