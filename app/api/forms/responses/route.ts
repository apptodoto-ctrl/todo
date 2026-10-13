import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const patientId = req.nextUrl.searchParams.get("patientId");
    const responses = await prisma.formResponse.findMany({
      where: { createdBy: session.email, ...(patientId ? { patientId: Number(patientId) } : {}) },
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
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const body = await req.json();
    const patientId = Number(body.patientId);
    const templateId = Number(body.templateId);
    if (!patientId || !templateId) {
      return NextResponse.json({ error: "Falta el usuario o la plantilla" }, { status: 400 });
    }

    const [patient, template] = await Promise.all([
      prisma.patient.findUnique({ where: { id: patientId } }),
      prisma.formTemplate.findUnique({ where: { id: templateId } }),
    ]);
    if (!patient || !template) return notFound();
    if (patient.createdBy !== session.email || template.createdBy !== session.email) return forbidden();

    const created = await prisma.formResponse.create({
      data: {
        patientId,
        templateId,
        title: String(body.title ?? template.name).slice(0, 160),
        answers: (body.answers ?? {}) as never,
        createdBy: session.email,
      },
      include: { template: { select: { name: true, sections: true } } },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("Form response create error:", err);
    return NextResponse.json({ error: "No se pudo guardar la ficha" }, { status: 500 });
  }
}
