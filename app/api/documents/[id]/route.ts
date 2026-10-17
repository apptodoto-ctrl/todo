import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteFromR2, getPresignedUrl } from "@/lib/r2";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, ownScope } from "@/lib/center";
import { documentScope, cleanTags } from "@/lib/documents";

type Params = Promise<{ id: string }>;

/** Para editar o borrar hay que ser dueña; para ver basta con que esté compartido con tu especialidad */
async function ownedDoc(id: number, mode: "edit" | "view" = "edit") {
  const scope = await getScope();
  if (!scope) return { error: unauthorized() };
  const where = mode === "view" ? await documentScope(scope) : ownScope(scope);
  const doc = await prisma.document.findFirst({ where: { id, ...where } });
  if (!doc) {
    const existe = await prisma.document.findUnique({ where: { id } });
    return { error: existe ? forbidden() : notFound() };
  }
  return { doc };
}

// Devuelve una URL firmada temporal (1 hora) para ver/descargar el documento
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  const { id } = await params;
  const check = await ownedDoc(parseInt(id), "view");
  if ("error" in check) return check.error;
  try {
    const url = await getPresignedUrl(check.doc.key, 3600);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "No se pudo generar el enlace" }, { status: 500 });
  }
}

const CATEGORIES = ["Sin categoría", "Evaluaciones", "Protocolos", "Guías", "Actividades", "Formularios", "Factura / Boleta", "Historia clínica externa", "Consentimientos"];

// Cambiar la categoría (o el nombre) de un documento ya subido
export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  const { id } = await params;
  const check = await ownedDoc(parseInt(id));
  if ("error" in check) return check.error;
  try {
    const { category, name, patientId, specialties } = await req.json();
    const scope = await getScope();
    if (category !== undefined && !CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Categoría no válida" }, { status: 400 });
    }
    const doc = await prisma.document.update({
      where: { id: check.doc.id },
      data: {
        ...(category !== undefined ? { category } : {}),
        ...(name !== undefined && String(name).trim() ? { name: String(name).trim() } : {}),
        ...(patientId !== undefined ? { patientId: patientId ? Number(patientId) : null } : {}),
        ...(specialties !== undefined && scope?.centerId && scope.isAdmin ? { specialties: cleanTags(specialties) } : {}),
      },
    });
    return NextResponse.json(doc);
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el documento" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  const { id } = await params;
  const check = await ownedDoc(parseInt(id));
  if ("error" in check) return check.error;

  await deleteFromR2(check.doc.key);
  await prisma.document.delete({ where: { id: check.doc.id } });

  return NextResponse.json({ success: true });
}
