import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

/** Ventana máxima hacia atrás: si la app estuvo caída, no reenvía avisos viejos */
const MAX_LATE_MINUTES = 12 * 60;

const CATEGORY_LABEL: Record<string, string> = {
  Cita: "Cita",
  Pago: "Pago",
  Recordatorio: "Recordatorio",
};

function formatDate(due: string): string {
  const [y, m, d] = due.split("-").map(Number);
  if (!y || !m || !d) return due;
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}

export function taskEmailHtml(task: { title: string; description: string; due: string; time: string; category: string; patientName: string }) {
  const label = CATEGORY_LABEL[task.category] ?? task.category;
  const when = [task.due ? formatDate(task.due) : "", task.time].filter(Boolean).join(" · ");
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="color:#ffffff;margin:0;font-size:20px;">Recordatorio de tu agenda</h1>
      </div>
      <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">
        <h2 style="color:#1e293b;margin:0 0 8px;font-size:18px;">${task.title}</h2>
        ${task.description ? `<p style="color:#64748b;margin:0 0 16px;line-height:1.5;">${task.description}</p>` : ""}
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#475569;">
          ${when ? `<tr><td style="padding:6px 0;width:110px;color:#94a3b8;">Cuándo</td><td style="padding:6px 0;font-weight:600;">${when}</td></tr>` : ""}
          <tr><td style="padding:6px 0;color:#94a3b8;">Categoría</td><td style="padding:6px 0;font-weight:600;">${label}</td></tr>
          ${task.patientName ? `<tr><td style="padding:6px 0;color:#94a3b8;">Usuario</td><td style="padding:6px 0;font-weight:600;">${task.patientName}</td></tr>` : ""}
        </table>
        <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;">Puedes marcarla como completada en TOdo Therapy.</p>
      </div>
    </div>`;
}

/**
 * Envía el aviso de las tareas con recordatorio cuya fecha y hora ya llegaron.
 * Cada tarea avisa una sola vez (notifiedAt).
 */
export async function processTaskReminders(): Promise<{ sent: number; checked: number }> {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const pending = await prisma.task.findMany({
    where: {
      notify: true,
      notifiedAt: null,
      status: { not: "completada" },
      due: { not: "", lte: today },
    },
  });

  let sent = 0;
  for (const task of pending) {
    const [h, m] = (task.time || "09:00").split(":").map(Number);
    const [y, mo, d] = task.due.split("-").map(Number);
    const dueAt = new Date(y, mo - 1, d, h || 0, m || 0);
    const minutesLate = (now.getTime() - dueAt.getTime()) / 60000;
    if (minutesLate < 0) continue; // todavía no toca
    if (minutesLate > MAX_LATE_MINUTES) {
      // Demasiado viejo: se marca como avisado para no llenar la bandeja
      await prisma.task.update({ where: { id: task.id }, data: { notifiedAt: now } });
      continue;
    }
    if (!task.createdBy) continue;
    try {
      await sendEmail(task.createdBy, `Recordatorio: ${task.title}`, taskEmailHtml(task));
      await prisma.task.update({ where: { id: task.id }, data: { notifiedAt: now } });
      sent++;
    } catch (err) {
      console.error(`[tasks] no se pudo enviar el aviso de la tarea ${task.id}:`, err);
    }
  }

  return { sent, checked: pending.length };
}
