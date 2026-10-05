/** Cálculo de las fechas que componen una serie de citas */

function toMinutes(time: string): number {
  const [h, m] = (time || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** Día de la semana de una fecha: 0 = domingo … 6 = sábado */
function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** Posición del día dentro de la semana que empieza en lunes */
function mondayOffset(weekday: number): number {
  return (weekday + 6) % 7;
}

export interface SeriesSlot {
  weekday: number;
  time: string;
}

/**
 * Fechas de una serie: la cita base más, si se repite, cada combinación de
 * día/hora elegida durante las semanas siguientes. Permite que un mismo
 * paciente tenga martes 17:00 y jueves 15:00 dentro de una sola serie.
 */
export function seriesOccurrences(
  date: string,
  time: string,
  weeks: number,
  slots: SeriesSlot[]
): { date: string; time: string }[] {
  const base = { date, time };
  if (!date || !time || weeks <= 0) return [base];

  const slotList: SeriesSlot[] = [{ weekday: weekdayOf(date), time }];
  for (const s of slots) {
    const weekday = Number(s?.weekday);
    const slotTime = String(s?.time ?? "").trim();
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue;
    if (!/^\d{1,2}:\d{2}$/.test(slotTime)) continue;
    if (slotList.some((x) => x.weekday === weekday && x.time === slotTime)) continue;
    slotList.push({ weekday, time: slotTime });
  }

  // Lunes de la semana en que arranca la serie
  const anchor = addDays(date, -mondayOffset(weekdayOf(date)));
  const seen = new Set([`${base.date} ${base.time}`]);
  const rest: { date: string; time: string }[] = [];

  for (let week = 0; week <= weeks; week++) {
    for (const slot of slotList) {
      const slotDate = addDays(anchor, week * 7 + mondayOffset(slot.weekday));
      if (slotDate < date) continue; // nada antes del inicio de la serie
      const key = `${slotDate} ${slot.time}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rest.push({ date: slotDate, time: slot.time });
    }
  }

  rest.sort((a, b) => (a.date === b.date ? toMinutes(a.time) - toMinutes(b.time) : a.date < b.date ? -1 : 1));
  return [base, ...rest];
}
