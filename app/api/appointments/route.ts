import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";
import { sendAppointmentCreatedNotice } from "@/lib/appointmentReminders";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const appointments = await prisma.appointment.findMany({
      where: { createdBy: session.email },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(appointments);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export async function POST(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { force, repeatWeeks, ...body } = await req.json();
    const duration = body.duration ? Number(body.duration) : 45;
    // Serie de sesiones: misma hora y día de la semana durante N semanas
    const weeks = Math.max(0, Math.min(52, Number(repeatWeeks) || 0));

    // Detección de choques de horario en el mismo día
    if (body.date && body.time && !force) {
      const sameDay = await prisma.appointment.findMany({
        where: { createdBy: session.email, date: body.date, status: { not: "cancelada" } },
      });
      const start = toMinutes(body.time);
      const end = start + duration;
      const conflict = sameDay.find((a) => {
        const aStart = toMinutes(a.time);
        const aEnd = aStart + (a.duration || 45);
        return start < aEnd && aStart < end;
      });
      if (conflict) {
        return NextResponse.json(
          { error: `Choca con "${conflict.title}" a las ${conflict.time}`, conflict: true },
          { status: 409 }
        );
      }
    }

    const seriesId = weeks > 0 ? randomUUID() : "";
    const base = {
      ...body,
      duration,
      patientId: body.patientId ? Number(body.patientId) : null,
      createdBy: session.email,
      seriesId,
    };

    const appointment = await prisma.appointment.create({ data: base });

    // Repeticiones semanales
    const extra = [];
    for (let i = 1; i <= weeks; i++) {
      const [y, m, d] = String(body.date).split("-").map(Number);
      const next = new Date(y, m - 1, d + i * 7);
      const dateStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
      extra.push(await prisma.appointment.create({ data: { ...base, date: dateStr } }));
    }

    // Aviso inmediato al paciente y al tutor (no debe bloquear la creación de la cita)
    sendAppointmentCreatedNotice(appointment.id).catch((err) =>
      console.error("[appointments] aviso de creación falló:", err)
    );

    return NextResponse.json({ ...appointment, series: [appointment, ...extra] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
