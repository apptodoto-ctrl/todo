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

function reminderHtml(opts: { heading: string; patientName: string; therapistName: string; typeLabel: string; dateStr: string; time: string }) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:20px;">📅 ${opts.heading}</h1>
      </div>
      <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
        <p style="color:#1e293b;margin:0 0 16px;">Hola ${opts.patientName},</p>
        <p style="color:#475569;margin:0 0 16px;">Te recordamos tu ${opts.typeLabel} de terapia ocupacional con <strong>${opts.therapistName}</strong>:</p>
        <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;">
          <span style="display:inline-block;background:#ede9fe;color:#7c3aed;padding:6px 14px;border-radius:8px;font-size:15px;font-weight:bold;">📅 ${opts.dateStr} · ⏰ ${opts.time} hrs</span>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;">Si no puedes asistir, por favor avisa con anticipación a tu terapeuta.</p>
      </div>
    </div>`;
}

const BANDS = [
  { flag: "reminder5dSent" as const, maxH: 120, minH: 24, heading: "Recordatorio: sesión próxima", when: "en los próximos días" },
  { flag: "reminder1dSent" as const, maxH: 24, minH: 4, heading: "Recordatorio: sesión mañana", when: "mañana" },
  { flag: "reminder4hSent" as const, maxH: 4, minH: 0, heading: "Recordatorio: sesión en pocas horas", when: "hoy" },
];

export async function processAppointmentReminders(): Promise<{ sent: number; checked: number }> {
  const now = nowInSantiago();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const horizon = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  const horizonStr = `${horizon.getFullYear()}-${String(horizon.getMonth() + 1).padStart(2, "0")}-${String(horizon.getDate()).padStart(2, "0")}`;

  const appointments = await prisma.appointment.findMany({
    where: {
      date: { gte: todayStr, lte: horizonStr },
      status: { notIn: ["cancelada", "asistio", "no_asistio"] },
      OR: [{ reminder5dSent: false }, { reminder1dSent: false }, { reminder4hSent: false }],
    },
  });

  let sent = 0;
  const patientCache = new Map<number, { name: string; email: string } | null>();
  const therapistCache = new Map<string, string>();

  for (const apt of appointments) {
    const when = appointmentDate(apt.date, apt.time);
    if (!when) continue;
    const diffH = (when.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffH <= 0) continue;

    const band = BANDS.find((b) => !apt[b.flag] && diffH <= b.maxH && diffH > b.minH);
    if (!band) continue;

    // Datos del paciente vinculado (si hay) y de la terapeuta
    let patient: { name: string; email: string } | null = null;
    if (apt.patientId) {
      if (!patientCache.has(apt.patientId)) {
        const p = await prisma.patient.findUnique({ where: { id: apt.patientId }, select: { name: true, email: true } });
        patientCache.set(apt.patientId, p);
      }
      patient = patientCache.get(apt.patientId) ?? null;
    }
    if (!therapistCache.has(apt.createdBy)) {
      const u = await prisma.user.findUnique({ where: { email: apt.createdBy }, select: { name: true } });
      therapistCache.set(apt.createdBy, u?.name ?? "tu terapeuta");
    }
    const therapistName = therapistCache.get(apt.createdBy)!;
    const typeLabel = typeLabels[apt.type] ?? "sesión";
    const dateStr = when.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });

    try {
      // Al paciente (si tiene email registrado)
      if (patient?.email) {
        await sendEmail(
          patient.email,
          `${band.heading} — TOdo Therapy`,
          reminderHtml({ heading: band.heading, patientName: patient.name.split(" ")[0], therapistName, typeLabel, dateStr, time: apt.time || "09:00" })
        );
      }
      // A la terapeuta
      if (apt.createdBy) {
        await sendEmail(
          apt.createdBy,
          `Agenda: ${apt.title} ${band.when} a las ${apt.time || "09:00"}`,
          `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:24px;border-radius:12px 12px 0 0;">
              <h1 style="color:white;margin:0;font-size:20px;">📅 Recordatorio de agenda</h1>
            </div>
            <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
              <p style="color:#1e293b;margin:0 0 16px;">Hola ${therapistName.split(" ")[0]}, tienes una ${typeLabel} ${band.when}:</p>
              <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                <p style="color:#1e293b;font-weight:bold;margin:0 0 6px;">${apt.title}</p>
                <span style="display:inline-block;background:#ede9fe;color:#7c3aed;padding:4px 12px;border-radius:8px;font-size:14px;">📅 ${dateStr} · ⏰ ${apt.time || "09:00"} hrs · ${apt.duration} min</span>
                ${apt.location ? `<p style="color:#64748b;font-size:13px;margin:10px 0 0;">${apt.location}</p>` : ""}
              </div>
            </div>
          </div>`
        );
      }
      await prisma.appointment.update({ where: { id: apt.id }, data: { [band.flag]: true } });
      sent++;
    } catch (err) {
      console.error(`Reminder error (appointment ${apt.id}):`, err);
    }
  }

  return { sent, checked: appointments.length };
}
