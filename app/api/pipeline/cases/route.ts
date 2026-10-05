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

    // Un usuario solo puede estar una vez en el mismo pipeline (en cualquier etapa)
    const pipelineId = column.pipelineId;
    if (pipelineId) {
      const existing = await prisma.pipelineCase.findFirst({
        where: {
          column: { pipelineId },
          ...(body.patientId
            ? { patientId: Number(body.patientId) }
            : { patient: { equals: String(body.patient ?? "").trim(), mode: "insensitive" as const } }),
        },
        include: { column: { select: { label: true } } },
      });
      if (existing) {
        return NextResponse.json(
          { error: `${existing.patient} ya está en este pipeline, en la etapa "${existing.column.label}".`, duplicate: true },
          { status: 409 }
        );
      }
    }

    const c = await prisma.pipelineCase.create({ data: body });
    return NextResponse.json(c, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
