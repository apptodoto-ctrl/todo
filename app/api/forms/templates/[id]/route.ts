import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { sanitizeSections } from "@/lib/formTemplates";

type Params = Promise<{ id: string }>;

async function owned(id: number, email: string) {
  const template = await prisma.formTemplate.findUnique({ where: { id } });
  if (!template) return { error: notFound() };
  if (template.createdBy !== email) return { error: forbidden() };
  return { template };
}

export async function GET(_: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  const { id } = await params;
  const { error, template } = await owned(Number(id), session.email);
  if (error) return error;
  return NextResponse.json(template);
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const { error } = await owned(Number(id), session.email);
    if (error) return error;
    const body = await req.json();
    const updated = await prisma.formTemplate.update({
      where: { id: Number(id) },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).slice(0, 120) } : {}),
        ...(body.description !== undefined ? { description: String(body.description).slice(0, 400) } : {}),
        ...(body.sections !== undefined ? { sections: sanitizeSections(body.sections) as never } : {}),
        ...(body.archived !== undefined ? { archived: body.archived === true } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la plantilla" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const { error } = await owned(Number(id), session.email);
    if (error) return error;
    // Borrar la plantilla se lleva las fichas llenadas: mejor avisar antes
    const usos = await prisma.formResponse.count({ where: { templateId: Number(id) } });
    if (usos > 0) {
      return NextResponse.json(
        { error: `Esta plantilla tiene ${usos} ficha${usos === 1 ? "" : "s"} llenada${usos === 1 ? "" : "s"}. Archívala en vez de borrarla.`, hasResponses: true },
        { status: 409 }
      );
    }
    await prisma.formTemplate.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
