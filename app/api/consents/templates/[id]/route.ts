import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, centerScope, can } from "@/lib/center";
import { CONSENT_KINDS } from "@/lib/consents";

type Params = Promise<{ id: string }>;

async function owned(id: number) {
  const scope = await getScope();
  if (!scope) return { error: unauthorized() };
  // En un Centro, los documentos los edita quien puede crear plantillas (la Administradora siempre)
  if (scope.centerId && !can(scope, "crearPlantillas")) return { error: forbidden() };
  const t = await prisma.consentTemplate.findFirst({ where: { id, ...centerScope(scope) } });
  if (t) return { template: t };
  const existe = await prisma.consentTemplate.findUnique({ where: { id } });
  return { error: existe ? forbidden() : notFound() };
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const check = await owned(Number(id));
  if ("error" in check) return check.error;
  try {
    const body = await req.json();
    const updated = await prisma.consentTemplate.update({
      where: { id: Number(id) },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).slice(0, 160) } : {}),
        ...(body.body !== undefined ? { body: String(body.body).slice(0, 20000) } : {}),
        ...(body.kind !== undefined && Object.keys(CONSENT_KINDS).includes(body.kind) ? { kind: body.kind } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  }
}

/** Se desactiva: los envíos ya hechos conservan su texto */
export async function DELETE(_: Request, { params }: { params: Params }) {
  const { id } = await params;
  const check = await owned(Number(id));
  if ("error" in check) return check.error;
  await prisma.consentTemplate.update({ where: { id: Number(id) }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
