import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";

type Params = Promise<{ id: string }>;

async function ownedReport(id: number, email: string) {
  const report = await prisma.generatedReport.findUnique({ where: { id } });
  if (!report) return { error: notFound() };
  if (report.createdBy !== email) return { error: forbidden() };
  return { report };
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const check = await ownedReport(Number(id), session.email);
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
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const check = await ownedReport(Number(id), session.email);
    if ("error" in check) return check.error;
    await prisma.generatedReport.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
