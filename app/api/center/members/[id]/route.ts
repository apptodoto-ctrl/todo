import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, parsePermissions, seatUsage } from "@/lib/center";
import { parseSchedule } from "@/lib/schedule";

type Params = Promise<{ id: string }>;

async function loadMember(id: string, centerId: string) {
  const member = await prisma.centerMember.findUnique({ where: { id } });
  if (!member || member.centerId !== centerId) return null;
  return member;
}

/** Cambiar permisos, desactivar o reactivar a una terapeuta */
export async function PATCH(req: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId || !scope.isAdmin) return forbidden();
  try {
    const { id } = await params;
    const member = await loadMember(id, scope.centerId);
    if (!member) return notFound();
    if (member.role === "administradora") {
      return NextResponse.json({ error: "La Administradora no se puede editar desde aquí" }, { status: 400 });
    }

    const body = await req.json();

    // Reactivar necesita un cupo libre
    if (body.active === true && !member.active) {
      const seats = await seatUsage(scope.centerId);
      if (seats.free <= 0) {
        return NextResponse.json({ error: "No te quedan cupos libres para reactivarla", needsExtraSeat: true, seats }, { status: 409 });
      }
    }

    // Antes de desactivar hay que decidir qué pasa con sus pacientes
    if (body.active === false && member.active) {
      const pacientes = await prisma.patient.count({ where: { centerId: scope.centerId, therapistEmail: member.userEmail } });
      if (pacientes > 0 && !body.transferTo && body.leaveUnassigned !== true) {
        return NextResponse.json(
          { error: `${member.name || member.userEmail} tiene ${pacientes} paciente${pacientes === 1 ? "" : "s"} a cargo. Elige a quién se los traspasas.`, needsTransfer: true, patients: pacientes },
          { status: 409 }
        );
      }
      if (body.transferTo) {
        const destino = await prisma.centerMember.findFirst({
          where: { centerId: scope.centerId, userEmail: String(body.transferTo), active: true },
        });
        if (!destino) return NextResponse.json({ error: "Esa terapeuta no está activa en el Centro" }, { status: 400 });
        await prisma.patient.updateMany({
          where: { centerId: scope.centerId, therapistEmail: member.userEmail },
          data: { therapistEmail: destino.userEmail, therapist: destino.name || destino.userEmail },
        });
      }
    }

    const updated = await prisma.centerMember.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).slice(0, 120) } : {}),
        ...(body.active !== undefined ? { active: body.active === true } : {}),
        ...(body.permissions !== undefined ? { permissions: parsePermissions(body.permissions) as never } : {}),
        ...(body.schedule !== undefined ? { schedule: parseSchedule(body.schedule) as never } : {}),
      },
    });

    return NextResponse.json({ ...updated, permissions: parsePermissions(updated.permissions) });
  } catch (err) {
    console.error("Center member update error:", err);
    return NextResponse.json({ error: "No se pudo actualizar" }, { status: 500 });
  }
}

/** Quitar una invitación que todavía no se aceptó */
export async function DELETE(_: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId || !scope.isAdmin) return forbidden();
  try {
    const { id } = await params;
    const member = await loadMember(id, scope.centerId);
    if (!member) return notFound();
    if (member.joinedAt !== null) {
      return NextResponse.json({ error: "Esta terapeuta ya entró. Desactívala en vez de borrarla." }, { status: 400 });
    }
    await prisma.centerMember.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
