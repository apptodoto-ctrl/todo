import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized } from "@/lib/apiAuth";
import { getScope, ownScope, ownerFields, loadPatient } from "@/lib/center";

export async function GET() {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const reports = await prisma.generatedReport.findMany({
      where: ownScope(scope),
      orderBy: { createdAt: "desc" },
      include: { patient: { select: { name: true } } },
    });
    return NextResponse.json(reports);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { patientId, type, title, content } = await req.json();
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Título y contenido requeridos" }, { status: 400 });
    }
    if (patientId) {
      const { patient } = await loadPatient(scope, Number(patientId));
      if (!patient) return NextResponse.json({ error: "Paciente inválido" }, { status: 403 });
    }
    const report = await prisma.generatedReport.create({
      data: {
        patientId: patientId ? Number(patientId) : null,
        type: type || "informe",
        title: title.trim(),
        content,
        ...ownerFields(scope),
      },
      include: { patient: { select: { name: true } } },
    });
    return NextResponse.json(report, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
