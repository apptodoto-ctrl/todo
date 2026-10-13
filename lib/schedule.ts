/** Horario de atención de cada terapeuta dentro del Centro */

export interface TimeRange {
  from: string; // HH:MM
  to: string;
}

/** Lunes a domingo; cada día con sus tramos de atención */
export type WeekSchedule = Record<string, TimeRange[]>;

export const DAY_KEYS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;

export const DAY_LABELS: Record<string, string> = {
  lun: "Lunes", mar: "Martes", mie: "Miércoles", jue: "Jueves",
  vie: "Viernes", sab: "Sábado", dom: "Domingo",
};

/** Índice de getDay() (0 = domingo) a la clave del día */
export function dayKeyOf(date: Date): string {
  return DAY_KEYS[(date.getDay() + 6) % 7];
}

export function dayKeyFromDateString(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return dayKeyOf(new Date(y, m - 1, d));
}

function toMinutes(time: string): number {
  const [h, m] = (time || "0:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function parseSchedule(raw: unknown): WeekSchedule | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const out: WeekSchedule = {};
  let tiene = false;
  for (const key of DAY_KEYS) {
    const tramos = Array.isArray(value[key]) ? (value[key] as unknown[]) : [];
    const limpios = tramos
      .map((t) => {
        const r = (t ?? {}) as Record<string, unknown>;
        const from = String(r.from ?? "");
        const to = String(r.to ?? "");
        return /^\d{1,2}:\d{2}$/.test(from) && /^\d{1,2}:\d{2}$/.test(to) && toMinutes(from) < toMinutes(to)
          ? { from, to }
          : null;
      })
      .filter((t): t is TimeRange => t !== null)
      .slice(0, 4);
    out[key] = limpios;
    if (limpios.length > 0) tiene = true;
  }
  return tiene ? out : null;
}

/**
 * ¿Cabe esta sesión dentro del horario de atención? Sin horario definido
 * se permite todo: el documento pide no estorbar a quien no lo configura.
 */
export function fitsSchedule(
  schedule: WeekSchedule | null,
  date: string,
  time: string,
  duration: number
): { ok: true } | { ok: false; reason: string } {
  if (!schedule) return { ok: true };
  const key = dayKeyFromDateString(date);
  const tramos = schedule[key] ?? [];
  if (tramos.length === 0) {
    return { ok: false, reason: `No atiende los ${DAY_LABELS[key].toLowerCase()}` };
  }
  const start = toMinutes(time);
  const end = start + (duration || 45);
  const cabe = tramos.some((t) => start >= toMinutes(t.from) && end <= toMinutes(t.to));
  if (cabe) return { ok: true };
  const horario = tramos.map((t) => `${t.from}–${t.to}`).join(" y ");
  return { ok: false, reason: `Su horario de los ${DAY_LABELS[key].toLowerCase()} es ${horario}` };
}
