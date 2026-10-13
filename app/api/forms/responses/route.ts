import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, patientScope, loadPatient, ownerFields } from "@/lib/center";

export async function GET(req: NextRequest) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const patientId = req.nextUrl.searchParams.get("patientId");
    const responses = await prisma.formResponse.findMany({
      where: { patient: patientScope(scope) as never, ...(patientId ? { patientId: Number(patientId) } : {}) },
      orderBy: { updatedAt: "desc" },
      include: { template: { select: { name: true, sections: true } } },
    });
    return NextResponse.json(responses);
  } catch (err) {
    console.error("Form responses error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const body = await req.json();
    const patientId = Number(body.patientId);
    const templateId = Number(body.templateId);
    if (!patientId || !templateId) {
      return NextResponse.json({ error: "Falta el usuario o la plantilla" }, { status: 400 });
    }

    const [{ patient, status }, template] = await Promise.all([
      loadPatient(scope, patientId),
      prisma.formTemplate.findUnique({ where: { id: templateId } }),
    ]);
    if (status === 404 || !template) return notFound();
    if (status === 403 || !patient) return forbidden();
    const plantillaAlAlcance = scope.centerId
      ? template.centerId === scope.centerId
      : template.createdBy === scope.email;
    if (!plantillaAlAlcance) return forbidden();

    const created = await prisma.formResponse.create({
      data: {
        patientId,
        templateId,
        title: String(body.title ?? template.name).slice(0, 160),
        answers: (body.answers ?? {}) as never,
        ...ownerFields(scope),
      },
      include: { template: { select: { name: true, sections: true } } },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("Form response create error:", err);
    return NextResponse.json({ error: "No se pudo guardar la ficha" }, { status: 500 });
  }
}
