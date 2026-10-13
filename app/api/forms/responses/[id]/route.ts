import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, canAccessPatient } from "@/lib/center";

type Params = Promise<{ id: string }>;

/** La ficha llenada pertenece al paciente: la ve quien alcanza a ese paciente */
async function owned(id: number) {
  const scope = await getScope();
  if (!scope) return { error: unauthorized() };
  const response = await prisma.formResponse.findUnique({ where: { id }, include: { patient: true } });
  if (!response) return { error: notFound() };
  if (!canAccessPatient(scope, response.patient)) return { error: forbidden() };
  return { response };
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id } = await params;
    const { error } = await owned(Number(id));
    if (error) return error;
    const body = await req.json();
    const updated = await prisma.formResponse.update({
      where: { id: Number(id) },
      data: {
        ...(body.answers !== undefined ? { answers: body.answers as never } : {}),
        ...(body.title !== undefined ? { title: String(body.title).slice(0, 160) } : {}),
      },
      include: { template: { select: { name: true, sections: true } } },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la ficha" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id } = await params;
    const { error } = await owned(Number(id));
    if (error) return error;
    await prisma.formResponse.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
