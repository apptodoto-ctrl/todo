import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";

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
    const { force, ...body } = await req.json();
    const duration = body.duration ? Number(body.duration) : 45;

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

    const appointment = await prisma.appointment.create({
      data: {
        ...body,
        duration,
        patientId: body.patientId ? Number(body.patientId) : null,
        createdBy: session.email,
      },
    });
    return NextResponse.json(appointment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
