import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, loadPatient, ownerFields } from "@/lib/center";

type Params = Promise<{ id: string }>;

/**
 * Notas internas del equipo sobre un paciente. Las ven la Administradora
 * y la terapeuta a cargo; nunca aparecen en un informe ni las ve la familia.
 */
export async function GET(_: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  const { id } = await params;
  const { patient, status } = await loadPatient(scope, Number(id));
  if (status === 404) return notFound();
  if (status === 403 || !patient) return forbidden();

  const notes = await prisma.internalNote.findMany({
    where: { patientId: patient.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notes);
}

export async function POST(req: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id } = await params;
    const { patient, status } = await loadPatient(scope, Number(id));
    if (status === 404) return notFound();
    if (status === 403 || !patient) return forbidden();

    const { body } = await req.json();
    const texto = String(body ?? "").trim();
    if (!texto) return NextResponse.json({ error: "Escribe la nota" }, { status: 400 });

    const note = await prisma.internalNote.create({
      data: {
        patientId: patient.id,
        body: texto.slice(0, 4000),
        authorName: scope.name,
        ...ownerFields(scope),
      },
    });
    return NextResponse.json(note, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la nota" }, { status: 500 });
  }
}
