import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, ownScope } from "@/lib/center";

type Params = Promise<{ id: string }>;

/** Dentro de un Centro, la Administradora alcanza lo de todo su equipo */
async function ownedReport(id: number) {
  const scope = await getScope();
  if (!scope) return { error: unauthorized() };
  const report = await prisma.generatedReport.findFirst({ where: { id, ...ownScope(scope) } });
  if (report) return { report };
  const existe = await prisma.generatedReport.findUnique({ where: { id } });
  return { error: existe ? forbidden() : notFound() };
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id } = await params;
    const check = await ownedReport(Number(id));
    if ("error" in check) return check.error;
    const { title, content } = await req.json();
    const report = await prisma.generatedReport.update({
      where: { id: Number(id) },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
      },
    });
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id } = await params;
    const check = await ownedReport(Number(id));
    if ("error" in check) return check.error;
    await prisma.generatedReport.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
