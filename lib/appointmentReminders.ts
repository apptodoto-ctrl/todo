import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

// Hora actual en Chile, como partes numéricas (el servidor corre en UTC)
function nowInSantiago(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return new Date(get("year"), get("month") - 1, get("day"), get("hour") === 24 ? 0 : get("hour"), get("minute"));
}

function appointmentDate(date: string, time: string): Date | null {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return null;
  const [hh, mm] = (time || "09:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh || 9, mm || 0);
}

const typeLabels: Record<string, string> = {
  sesion: "sesión",
  evaluacion: "evaluación",
  reunion: "reunión",
  grupal: "sesión grupal",
};

type AppointmentRow = {
  id: number; title: string; date: string; time: string; type: string;
  location: string; duration: number; patientId: number | null; createdBy: string;
};

/** Archivo .ics para que el destinatario agregue la cita a su calendario */
function buildICS(apt: AppointmentRow, therapistName: string): string {
  const [y, m, d] = apt.date.split("-").map(Number);
  const [hh, mi] = (apt.time || "09:00").split(":").map(Number);
  // Chile está en UTC-3 (horario de verano) o UTC-4; se usa la hora local con TZID
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mi)}00`;
  const endDate = new Date(y, m - 1, d, hh, mi + (apt.duration || 45));
  const end = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const label = typeLabels[apt.type] ?? "sesión";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TOdo Therapy//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:todo-therapy-${apt.id}@todo-to.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=America/Santiago:${start}`,
    `DTEND;TZID=America/Santiago:${end}`,
    `SUMMARY:${label.charAt(0).toUpperCase() + label.slice(1)} de terapia ocupacional`,
    `DESCRIPTION:Con ${therapistName}${apt.location ? ` - ${apt.location}` : ""}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Recordatorio de sesión",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function emailShell(heading: string, bodyHtml: string): string {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:20px;">${heading}</h1>
      </div>
      <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
        ${bodyHtml}
      </div>
    </div>`;
}

function dateLine(when: Date, time: string): string {
  const dateStr = when.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
  return `<div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;margin:16px 0;">
      <span style="display:inline-block;background:#ede9fe;color:#7c3aed;padding:6px 14px;border-radius:8px;font-size:15px;font-weight:bold;">📅 ${dateStr} · ⏰ ${time} hrs</span>
    </div>`;
}

/** Destinatarios de una cita: paciente y tutor (si tienen correo registrado) */
async function patientRecipients(patientId: number | null): Promise<{ email: string; name: string }[]> {
  if (!patientId) return [];
  const p = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { name: true, email: true, guardian: true, guardianEmail: true },
  });
  if (!p) return [];
  const list: { email: string; name: string }[] = [];
  if (p.email?.includes("@")) list.push({ email: p.email, name: p.name.split(" ")[0] });
  if (p.guardianEmail?.includes("@") && p.guardianEmail !== p.email) {
    list.push({ email: p.guardianEmail, name: (p.guardian || "").split(" ")[0] || "hola" });
  }
  return list;
}

async function therapistName(email: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { email }, select: { name: true } });
  return u?.name ?? "tu terapeuta";
}

/** Aviso inmediato al agendar: llega al paciente y al tutor con el evento de calendario adjunto */
export async function sendAppointmentCreatedNotice(appointmentId: number): Promise<boolean> {
  const apt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!apt) return false;
  const when = appointmentDate(apt.date, apt.time);
  if (!when || when.getTime() < Date.now()) return false;

  const tName = await therapistName(apt.createdBy);
  const recipients = await patientRecipients(apt.patientId);
  const label = typeLabels[apt.type] ?? "sesión";
  const ics = { filename: "sesion.ics", content: Buffer.from(buildICS(apt, tName)).toString("base64"), contentType: "text/calendar" };

  let delivered = 0;
  for (const r of recipients) {
    try {
      await sendEmail(
        r.email,
        `Sesión agendada: ${when.toLocaleDateString("es-CL", { day: "numeric", month: "long" })} a las ${apt.time}`,
        emailShell(
          "📅 Tu sesión quedó agendada",
          `<p style="color:#1e293b;margin:0 0 8px;">Hola ${r.name},</p>
           <p style="color:#475569;margin:0;">Quedó agendada tu ${label} de terapia ocupacional con <strong>${tName}</strong>:</p>
           ${dateLine(when, apt.time)}
           <p style="color:#475569;font-size:13px;margin:0;">Adjuntamos el evento para que lo agregues a tu calendario. Te enviaremos un recordatorio 24 horas y 4 horas antes.</p>
           <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;">Si necesitas reagendar, responde a tu terapeuta.</p>`
        ),
        [ics]
      );
      delivered++;
    } catch (err) {
      console.error(`[reminders] error avisando a ${r.email}:`, err);
    }
  }

  // Si había destinatarios pero ninguno recibió, se deja pendiente para reintentar en la próxima pasada
  if (recipients.length > 0 && delivered === 0) return false;
  await prisma.appointment.update({ where: { id: apt.id }, data: { createdNotifSent: true } });
  return delivered > 0;
}

// Ventanas de recordatorio pedidas: 24 horas y 4 horas antes
const BANDS = [
  { flag: "reminder1dSent" as const, maxH: 24, minH: 4, heading: "Recordatorio: sesión mañana", when: "mañana" },
  { flag: "reminder4hSent" as const, maxH: 4, minH: 0, heading: "Recordatorio: sesión en pocas horas", when: "hoy" },
];

export async function processAppointmentReminders(): Promise<{ sent: number; checked: number }> {
  const now = nowInSantiago();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const horizon = new Date(now.getTime() + 400 * 24 * 60 * 60 * 1000);
  const horizonStr = `${horizon.getFullYear()}-${String(horizon.getMonth() + 1).padStart(2, "0")}-${String(horizon.getDate()).padStart(2, "0")}`;

  const appointments = await prisma.appointment.findMany({
    where: {
      date: { gte: todayStr, lte: horizonStr },
      status: { notIn: ["cancelada", "asistio", "no_asistio"] },
      OR: [{ createdNotifSent: false }, { reminder1dSent: false }, { reminder4hSent: false }],
    },
  });

  let sent = 0;

  for (const apt of appointments) {
    const when = appointmentDate(apt.date, apt.time);
    if (!when) continue;
    const diffH = (when.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffH <= 0) continue;

    // Red de seguridad: si el aviso de creación no salió al agendar, se envía aquí
    if (!apt.createdNotifSent) {
      try {
        await sendAppointmentCreatedNotice(apt.id);
        sent++;
      } catch (err) {
        console.error(`[reminders] aviso de creación falló (cita ${apt.id}):`, err);
      }
    }

    const band = BANDS.find((b) => !apt[b.flag] && diffH <= b.maxH && diffH > b.minH);
    if (!band) continue;

    const tName = await therapistName(apt.createdBy);
    const typeLabel = typeLabels[apt.type] ?? "sesión";
    const recipients = await patientRecipients(apt.patientId);

    try {
      // Paciente y tutor
      for (const r of recipients) {
        await sendEmail(
          r.email,
          `${band.heading} — TOdo Therapy`,
          emailShell(
            `📅 ${band.heading}`,
            `<p style="color:#1e293b;margin:0 0 8px;">Hola ${r.name},</p>
             <p style="color:#475569;margin:0;">Te recordamos tu ${typeLabel} de terapia ocupacional con <strong>${tName}</strong>:</p>
             ${dateLine(when, apt.time)}
             <p style="color:#94a3b8;font-size:12px;margin:0;">Si no puedes asistir, avisa con anticipación a tu terapeuta.</p>`
          )
        );
      }

      // Terapeuta
      if (apt.createdBy) {
        await sendEmail(
          apt.createdBy,
          `Agenda: ${apt.title} ${band.when} a las ${apt.time || "09:00"}`,
          emailShell(
            "📅 Recordatorio de agenda",
            `<p style="color:#1e293b;margin:0 0 8px;">Hola ${tName.split(" ")[0]}, tienes una ${typeLabel} ${band.when}:</p>
             <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
               <p style="color:#1e293b;font-weight:bold;margin:0 0 6px;">${apt.title}</p>
               <span style="display:inline-block;background:#ede9fe;color:#7c3aed;padding:4px 12px;border-radius:8px;font-size:14px;">📅 ${when.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })} · ⏰ ${apt.time || "09:00"} hrs · ${apt.duration} min</span>
               ${apt.location ? `<p style="color:#64748b;font-size:13px;margin:10px 0 0;">${apt.location}</p>` : ""}
             </div>`
          )
        );
      }

      await prisma.appointment.update({ where: { id: apt.id }, data: { [band.flag]: true } });
      sent++;
    } catch (err) {
      console.error(`[reminders] error (cita ${apt.id}):`, err);
    }
  }

  return { sent, checked: appointments.length };
}
