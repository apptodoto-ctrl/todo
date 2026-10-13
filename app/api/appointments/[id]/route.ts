import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, agendaScope, patientScope } from "@/lib/center";
import { findPatientByName } from "@/lib/patientMatch";

type Params = Promise<{ id: string }>;

/** La cita es de quien la agendó; la Administradora ve las de todo el Centro */
async function loadOwned(id: number, scope: Awaited<ReturnType<typeof getScope>>) {
  if (!scope) return { error: unauthorized() };
  const appointment = await prisma.appointment.findFirst({ where: { id, ...agendaScope(scope) } });
  if (!appointment) {
    const existe = await prisma.appointment.findUnique({ where: { id } });
    return { error: existe ? forbidden() : notFound() };
  }
  return { appointment };
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id } = await params;
    const { error, appointment } = await loadOwned(Number(id), scope);
    if (error) return error;
    const body = await req.json();
    // Solo se intenta ligar a una ficha si la cita todavía no tiene paciente:
    // renombrar una cita ya ligada nunca debe moverla a otro paciente.
    const relinked =
      appointment!.patientId === null && body.patientId === undefined && body.title !== undefined
        ? await findPatientByName(patientScope(scope), String(body.title))
        : null;
    const updated = await prisma.appointment.update({
      where: { id: Number(id) },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.date !== undefined ? { date: body.date } : {}),
        ...(body.time !== undefined ? { time: body.time } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.location !== undefined ? { location: body.location } : {}),
        ...(body.duration !== undefined ? { duration: Number(body.duration) } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.patientId !== undefined ? { patientId: body.patientId ? Number(body.patientId) : null } : relinked ? { patientId: relinked } : {}),
        ...(body.paid !== undefined ? { paid: body.paid === true } : {}),
        ...(body.value !== undefined ? { value: body.value === "" || body.value === null ? null : Number(body.value) } : {}),
      },
    });
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
    const { error } = await loadOwned(Number(id), scope);
    if (error) return error;
    await prisma.appointment.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
