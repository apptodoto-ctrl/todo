import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized } from "@/lib/apiAuth";
import { getScope, agendaScope, ownerFields, patientScope, canManageMoney } from "@/lib/center";
import { sendAppointmentCreatedNotice, notifyTherapistOfAppointment } from "@/lib/appointmentReminders";
import { randomUUID } from "crypto";
import { seriesOccurrences } from "@/lib/appointmentSeries";
import { findPatientByName } from "@/lib/patientMatch";
import { parseSchedule, fitsSchedule } from "@/lib/schedule";

export async function GET() {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const appointments = await prisma.appointment.findMany({
      where: agendaScope(scope),
      orderBy: [{ date: "asc" }, { time: "asc" }],
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
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { force, repeatWeeks, slots, ...body } = await req.json();
    // Valor propio de esta cita: vacío = se cobra el valor del usuario.
    // En un Centro, el valor y el pago los fija la Administradora.
    if (!canManageMoney(scope)) { delete body.value; delete body.paid; }
    body.value = body.value === "" || body.value === undefined || body.value === null ? null : Number(body.value);
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
          ...agendaScope(scope),
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

    // Si se escribió el nombre a mano, se liga a la ficha cuando no hay dudas:
    // de eso dependen "Próxima sesión", el historial y los cobros del paciente.
    const patientId = body.patientId
      ? Number(body.patientId)
      : await findPatientByName(patientScope(scope), String(body.title ?? ""));

    // En un Centro, la Administradora puede agendar para otra terapeuta
    let owner = scope.email;
    if (scope.centerId && body.therapistEmail && body.therapistEmail !== scope.email) {
      if (!scope.isAdmin) {
        return NextResponse.json({ error: "Solo la Administradora agenda en la agenda de otra terapeuta" }, { status: 403 });
      }
      const miembro = await prisma.centerMember.findFirst({
        where: { centerId: scope.centerId, userEmail: String(body.therapistEmail), active: true },
      });
      if (!miembro) return NextResponse.json({ error: "Esa terapeuta no está activa en el Centro" }, { status: 400 });
      owner = miembro.userEmail;
    }
    delete body.therapistEmail;

    // Licencia: no se agenda a quien está pausada
    if (scope.centerId) {
      const miembro = await prisma.centerMember.findFirst({
        where: { centerId: scope.centerId, userEmail: owner },
        select: { pausedUntil: true, pausedReason: true, name: true },
      });
      if (miembro?.pausedUntil && miembro.pausedUntil > new Date()) {
        const hasta = miembro.pausedUntil.toLocaleDateString("es-CL");
        return NextResponse.json(
          { error: `${miembro.name || "La terapeuta"} está con licencia hasta el ${hasta}${miembro.pausedReason ? ` (${miembro.pausedReason})` : ""}.`, onLeave: true },
          { status: 409 }
        );
      }
    }

    // Sala ocupada: dos sesiones no caben en el mismo box a la misma hora
    if (scope.centerId && body.roomId && !force) {
      const mismasFechas = await prisma.appointment.findMany({
        where: {
          centerId: scope.centerId,
          roomId: String(body.roomId),
          date: { in: occurrences.map((o) => o.date) },
          status: { not: "cancelada" },
        },
        select: { date: true, time: true, duration: true, title: true },
      });
      for (const occ of occurrences) {
        const start = toMinutes(occ.time);
        const end = start + duration;
        const choque = mismasFechas.find((a) => {
          if (a.date !== occ.date) return false;
          const aStart = toMinutes(a.time);
          return start < aStart + (a.duration || 45) && aStart < end;
        });
        if (choque) {
          const sala = await prisma.centerRoom.findUnique({ where: { id: String(body.roomId) }, select: { name: true } });
          return NextResponse.json(
            { error: `La sala ${sala?.name ?? ""} ya está ocupada el ${choque.date} a las ${choque.time} con "${choque.title}".`, roomBusy: true },
            { status: 409 }
          );
        }
      }
    }

    // Horario de atención: no se agenda fuera de él
    if (scope.centerId && !force) {
      const miembro = await prisma.centerMember.findFirst({
        where: { centerId: scope.centerId, userEmail: owner },
        select: { schedule: true, name: true },
      });
      const horario = parseSchedule(miembro?.schedule);
      for (const occ of occurrences) {
        const cabe = fitsSchedule(horario, occ.date, occ.time, duration);
        if (!cabe.ok) {
          return NextResponse.json(
            { error: `${miembro?.name || "La terapeuta"} no atiende en ese horario. ${cabe.reason}.`, outsideSchedule: true },
            { status: 409 }
          );
        }
      }
    }

    const seriesId = occurrences.length > 1 ? randomUUID() : "";
    const base = {
      ...body,
      duration,
      patientId,
      ...ownerFields(scope),
      createdBy: owner,
      scheduledBy: owner === scope.email ? "" : scope.email,
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

    // Si la agendó la Administradora, la terapeuta recibe el aviso
    if (owner !== scope.email) {
      notifyTherapistOfAppointment(appointment.id, owner, scope.name, "agendó").catch((err) =>
        console.error("[appointments] aviso a la terapeuta falló:", err)
      );
    }

    return NextResponse.json({ ...appointment, series: [appointment, ...extra] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
