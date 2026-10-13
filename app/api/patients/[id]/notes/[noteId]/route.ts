import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, loadPatient } from "@/lib/center";

type Params = Promise<{ id: string; noteId: string }>;

export async function DELETE(_: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id, noteId } = await params;
    const { patient, status } = await loadPatient(scope, Number(id));
    if (status === 404) return notFound();
    if (status === 403 || !patient) return forbidden();

    const note = await prisma.internalNote.findUnique({ where: { id: Number(noteId) } });
    if (!note || note.patientId !== patient.id) return notFound();
    // La borra quien la escribió, o la Administradora
    if (note.createdBy !== scope.email && !scope.isAdmin) return forbidden();

    await prisma.internalNote.delete({ where: { id: Number(noteId) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
