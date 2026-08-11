import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";

export async function GET() {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const reports = await prisma.generatedReport.findMany({
      where: { createdBy: session.email },
      orderBy: { createdAt: "desc" },
      include: { patient: { select: { name: true } } },
    });
    return NextResponse.json(reports);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { patientId, type, title, content } = await req.json();
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Título y contenido requeridos" }, { status: 400 });
    }
    if (patientId) {
      const patient = await prisma.patient.findUnique({ where: { id: Number(patientId) } });
      if (!patient || patient.createdBy !== session.email) {
        return NextResponse.json({ error: "Paciente inválido" }, { status: 403 });
      }
    }
    const report = await prisma.generatedReport.create({
      data: {
        patientId: patientId ? Number(patientId) : null,
        type: type || "informe",
        title: title.trim(),
        content,
        createdBy: session.email,
      },
      include: { patient: { select: { name: true } } },
    });
    return NextResponse.json(report, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
