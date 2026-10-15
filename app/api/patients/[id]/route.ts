import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, loadPatient, canManageMoney } from "@/lib/center";

type Params = Promise<{ id: string }>;

export async function PUT(req: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id } = await params;
    const { patient, status } = await loadPatient(scope, Number(id));
    if (status === 404) return notFound();
    if (status === 403 || !patient) return forbidden();

    const body = await req.json();
    delete body.createdBy;
    delete body.centerId;
    delete body.id;
    // El valor de sesión lo fija la Administradora del Centro
    if (!canManageMoney(scope)) delete body.sessionValue;

    // Cambiar la terapeuta a cargo es cosa de la Administradora
    if (body.therapistEmail !== undefined && scope.centerId && !scope.isAdmin) {
      delete body.therapistEmail;
    }
    // Y solo puede recaer en alguien activo del Centro
    if (body.therapistEmail && scope.centerId) {
      const destino = await prisma.centerMember.findFirst({
        where: { centerId: scope.centerId, userEmail: String(body.therapistEmail), active: true },
      });
      if (!destino) {
        return NextResponse.json({ error: "Esa terapeuta no está activa en el Centro" }, { status: 400 });
      }
      body.therapist = destino.name || destino.userEmail;
    }

    const updated = await prisma.patient.update({ where: { id: Number(id) }, data: body });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id } = await params;
    const { patient, status } = await loadPatient(scope, Number(id));
    if (status === 404) return notFound();
    if (status === 403 || !patient) return forbidden();

    // En un Centro, la ficha es del Centro: solo la Administradora la borra
    if (scope.centerId && !scope.isAdmin) {
      return NextResponse.json(
        { error: "Las fichas son del Centro. Pídele a la Administradora que la elimine." },
        { status: 403 }
      );
    }

    await prisma.patient.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar: el usuario tiene registros asociados" }, { status: 500 });
  }
}
