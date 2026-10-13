import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { findPatientByName } from "@/lib/patientMatch";

type Params = Promise<{ id: string }>;

async function loadOwned(id: number, email: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) return { error: notFound() };
  if (appointment.createdBy !== email) return { error: forbidden() };
  return { appointment };
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const { error, appointment } = await loadOwned(Number(id), session.email);
    if (error) return error;
    const body = await req.json();
    // Solo se intenta ligar a una ficha si la cita todavía no tiene paciente:
    // renombrar una cita ya ligada nunca debe moverla a otro paciente.
    const relinked =
      appointment!.patientId === null && body.patientId === undefined && body.title !== undefined
        ? await findPatientByName(session.email, String(body.title))
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
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const { error } = await loadOwned(Number(id), session.email);
    if (error) return error;
    await prisma.appointment.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
