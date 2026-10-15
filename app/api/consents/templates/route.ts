import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden } from "@/lib/apiAuth";
import { getScope, centerScope, ownerFields, can } from "@/lib/center";
import { DEFAULT_CONSENTS, CONSENT_KINDS } from "@/lib/consents";

export async function GET() {
  const scope = await getScope();
  if (!scope) return unauthorized();
  const templates = await prisma.consentTemplate.findMany({
    where: { ...centerScope(scope), active: true },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { requests: true } } },
  });
  return NextResponse.json(templates.map((t) => ({ ...t, usos: t._count.requests })));
}

export async function POST(req: Request) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (scope.centerId && !can(scope, "crearPlantillas")) return forbidden();
  try {
    const body = await req.json();

    // Los cinco documentos tipo, de una vez
    if (body.useDefaults === true) {
      const existentes = await prisma.consentTemplate.findMany({ where: { ...centerScope(scope), active: true }, select: { kind: true } });
      const ya = new Set(existentes.map((e) => e.kind));
      const nuevos = DEFAULT_CONSENTS.filter((d) => !ya.has(d.kind));
      for (const d of nuevos) {
        await prisma.consentTemplate.create({ data: { name: d.name, kind: d.kind, body: d.body, ...ownerFields(scope) } });
      }
      return NextResponse.json({ created: nuevos.length }, { status: 201 });
    }

    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Ponle un nombre al documento" }, { status: 400 });
    const created = await prisma.consentTemplate.create({
      data: {
        name: name.slice(0, 160),
        kind: Object.keys(CONSENT_KINDS).includes(body.kind) ? body.kind : "otro",
        body: String(body.body ?? "").slice(0, 20000),
        ...ownerFields(scope),
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo crear el documento" }, { status: 500 });
  }
}
