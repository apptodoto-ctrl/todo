import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

const TYPE_LABELS: Record<string, string> = {
  sesion: "Sesión",
  evaluacion: "Evaluación",
  reunion: "Reunión",
  grupal: "Sesión grupal",
};

/** Google Calendar y Apple Calendar cortan las líneas largas a 75 octetos */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    parts.push(rest.slice(0, 73));
    rest = rest.slice(73);
  }
  parts.push(rest);
  return parts.join("\r\n ");
}

/** Escapa los caracteres que el formato iCalendar trata como separadores */
function esc(text: string): string {
  return (text || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export async function ensureCalendarToken(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email }, select: { calendarToken: true } });
  if (!user) return null;
  if (user.calendarToken) return user.calendarToken;
  return regenerateCalendarToken(email);
}

export async function regenerateCalendarToken(email: string): Promise<string | null> {
  const token = randomBytes(24).toString("hex");
  const updated = await prisma.user.updateMany({ where: { email }, data: { calendarToken: token } });
  return updated.count > 0 ? token : null;
}

/**
 * Agenda completa de una terapeuta en formato iCalendar, para suscribirse
 * desde Google Calendar, Apple Calendar u Outlook.
 */
export async function buildCalendarFeed(token: string): Promise<string | null> {
  if (!token || token.length < 16) return null;
  const user = await prisma.user.findFirst({
    where: { calendarToken: token },
    select: { email: true, name: true },
  });
  if (!user) return null;

  // Ventana razonable: lo del último trimestre y todo lo que viene
  const from = new Date();
  from.setMonth(from.getMonth() - 3);
  const fromStr = `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`;

  const appointments = await prisma.appointment.findMany({
    where: { createdBy: user.email, date: { gte: fromStr } },
    orderBy: { date: "asc" },
  });

  const patientIds = [...new Set(appointments.map((a) => a.patientId).filter((id): id is number => !!id))];
  const patients = patientIds.length
    ? await prisma.patient.findMany({ where: { id: { in: patientIds } }, select: { id: true, name: true } })
    : [];
  const nameOf = new Map(patients.map((p) => [p.id, p.name]));

  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TOdo Therapy//Agenda//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`TOdo Therapy — ${user.name}`)}`,
    "X-WR-TIMEZONE:America/Santiago",
    "REFRESH-INTERVAL;VALUE=DURATION:PT2H",
    "X-PUBLISHED-TTL:PT2H",
  ];

  for (const apt of appointments) {
    const [y, m, d] = apt.date.split("-").map(Number);
    const [hh, mi] = (apt.time || "09:00").split(":").map(Number);
    if (!y || !m || !d) continue;
    const start = `${y}${pad(m)}${pad(d)}T${pad(hh || 0)}${pad(mi || 0)}00`;
    const endDate = new Date(y, m - 1, d, hh || 0, (mi || 0) + (apt.duration || 45));
    const end = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;

    const label = TYPE_LABELS[apt.type] ?? "Sesión";
    const who = apt.patientId ? nameOf.get(apt.patientId) ?? apt.title : apt.title;
    const description = [
      `${label} agendada en TOdo Therapy`,
      apt.location ? `Nota: ${apt.location}` : "",
      apt.paid ? "Pagada" : "",
    ].filter(Boolean).join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:todo-therapy-${apt.id}@todo-to.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=America/Santiago:${start}`,
      `DTEND;TZID=America/Santiago:${end}`,
      fold(`SUMMARY:${esc(`${label}: ${who}`)}`),
      fold(`DESCRIPTION:${esc(description)}`),
      ...(apt.location ? [fold(`LOCATION:${esc(apt.location)}`)] : []),
      `STATUS:${apt.status === "cancelada" ? "CANCELLED" : "CONFIRMED"}`,
      `CATEGORIES:${esc(label)}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
