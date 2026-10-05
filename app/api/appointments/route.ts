import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";
import { sendAppointmentCreatedNotice } from "@/lib/appointmentReminders";
import { randomUUID } from "crypto";
import { seriesOccurrences } from "@/lib/appointmentSeries";

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
    const { force, repeatWeeks, slots, ...body } = await req.json();
    const duration = body.duration ? Number(body.duration) : 45;
    // Serie de sesiones: hasta N semanas, con uno o varios días/horas por semana
    const weeks = Math.max(0, Math.min(52, Number(repeatWeeks) || 0));
    const occurrences = seriesOccurrences(
      String(body.date ?? ""),
      String(body.time ?? ""),
      weeks,
      Array.isArray(slots) ? slots : []
    );

    // Detección de choques de horario en cualquier fecha de la serie
    if (body.date && body.time && !force) {
      const existing = await prisma.appointment.findMany({
        where: {
          createdBy: session.email,
          date: { in: occurrences.map((o) => o.date) },
          status: { not: "cancelada" },
        },
      });
      let conflict: { title: string; time: string; date: string } | undefined;
      for (const occ of occurrences) {
        const start = toMinutes(occ.time);
        const end = start + duration;
        const hit = existing.find((a) => {
          if (a.date !== occ.date) return false;
          const aStart = toMinutes(a.time);
          const aEnd = aStart + (a.duration || 45);
          return start < aEnd && aStart < end;
        });
        if (hit) {
          conflict = hit;
          break;
        }
      }
      if (conflict) {
        const sameDay = conflict.date === body.date;
        return NextResponse.json(
          {
            error: sameDay
              ? `Choca con "${conflict.title}" a las ${conflict.time}`
              : `Choca con "${conflict.title}" el ${conflict.date} a las ${conflict.time}`,
            conflict: true,
          },
          { status: 409 }
        );
      }
    }

    const seriesId = occurrences.length > 1 ? randomUUID() : "";
    const base = {
      ...body,
      duration,
      patientId: body.patientId ? Number(body.patientId) : null,
      createdBy: session.email,
      seriesId,
    };

    const [first, ...others] = occurrences;
    const appointment = await prisma.appointment.create({
      data: { ...base, date: first.date, time: first.time },
    });

    const extra = [];
    for (const occ of others) {
      extra.push(await prisma.appointment.create({ data: { ...base, date: occ.date, time: occ.time } }));
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
