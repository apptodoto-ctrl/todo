"use client";

import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";

export interface GridEvent {
  id?: number;
  date: Date;
  title: string;
  time: string;
  type: string;
  location: string;
  duration: number;
  status: string;
  patientId: number | null;
}

const typeStyles: Record<string, string> = {
  sesion: "bg-violet-500 border-violet-600",
  evaluacion: "bg-blue-500 border-blue-600",
  reunion: "bg-emerald-500 border-emerald-600",
  grupal: "bg-amber-500 border-amber-600",
};

const HOUR_PX = 56;
/** Ancho mínimo por día: en pantallas chicas la semana se desplaza en horizontal */
const MIN_DAY_PX = 96;
const GUTTER_PX = 56;

function toMinutes(time: string): number {
  const [h, m] = (time || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Reparte el ancho entre las citas que se pisan en el mismo horario */
function layout(events: GridEvent[]) {
  const sorted = [...events].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  const result: { ev: GridEvent; col: number; cols: number }[] = [];
  let cluster: GridEvent[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const columns: GridEvent[][] = [];
    for (const ev of cluster) {
      const start = toMinutes(ev.time);
      let placed = false;
      for (const col of columns) {
        const last = col[col.length - 1];
        if (toMinutes(last.time) + (last.duration || 45) <= start) {
          col.push(ev);
          placed = true;
          break;
        }
      }
      if (!placed) columns.push([ev]);
    }
    columns.forEach((col, ci) => col.forEach((ev) => result.push({ ev, col: ci, cols: columns.length })));
    cluster = [];
    clusterEnd = -1;
  };

  for (const ev of sorted) {
    const start = toMinutes(ev.time);
    const end = start + (ev.duration || 45);
    if (cluster.length > 0 && start >= clusterEnd) flush();
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return result;
}

interface Props {
  days: Date[];
  events: GridEvent[];
  onSelectSlot: (date: Date, time: string) => void;
  onSelectEvent: (ev: GridEvent) => void;
}

export default function TimeGrid({ days, events, onSelectSlot, onSelectEvent }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());

  // El rango horario se ajusta a las citas del período, con un mínimo de 08:00 a 20:00
  const visible = events.filter((e) => days.some((d) => isSameDay(d, e.date)));
  const times = visible.map((e) => toMinutes(e.time));
  const ends = visible.map((e) => toMinutes(e.time) + (e.duration || 45));
  const startHour = times.length ? Math.min(8, Math.floor(Math.min(...times) / 60)) : 8;
  const endHour = ends.length ? Math.max(20, Math.ceil(Math.max(...ends) / 60)) : 20;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // Al abrir, deja a la vista el horario de trabajo
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (9 - startHour) * HOUR_PX - 20);
  }, [startHour]);

  const nowOffset = (now.getHours() * 60 + now.getMinutes() - startHour * 60) * (HOUR_PX / 60);
  const showNowLine = days.some((d) => isSameDay(d, now)) && nowOffset > 0 && nowOffset < hours.length * HOUR_PX;
  const minWidth = days.length > 1 ? days.length * MIN_DAY_PX + GUTTER_PX : undefined;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
      <div ref={scrollRef} className="overflow-auto touch-scroll" style={{ maxHeight: "65vh" }}>
        <div style={{ minWidth }}>
          {/* Encabezado de días */}
          <div className="flex border-b border-slate-100 sticky top-0 bg-white z-20">
            <div className="shrink-0 border-r border-slate-100 bg-white sticky left-0 z-10" style={{ width: GUTTER_PX }} />
            {days.map((d) => {
              const today = isSameDay(d, now);
              return (
                <div key={d.toISOString()} className="flex-1 min-w-0 py-2 text-center border-r border-slate-100 last:border-r-0">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">
                    {format(d, days.length > 1 ? "EEE" : "EEEE", { locale: es })}
                  </p>
                  <p className={`text-sm font-bold mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full ${today ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white" : "text-slate-700"}`}>
                    {format(d, "d")}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Franjas horarias */}
          <div className="flex relative" style={{ height: hours.length * HOUR_PX }}>
            {/* Columna de horas */}
            <div className="shrink-0 border-r border-slate-100 bg-white sticky left-0 z-10" style={{ width: GUTTER_PX }}>
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_PX }} className="relative">
                  <span className="absolute -top-2 right-1.5 text-[10px] sm:text-[11px] text-slate-400">{String(h).padStart(2, "0")}:00</span>
                </div>
              ))}
            </div>

            {/* Columnas de días */}
            {days.map((d) => {
              const dayEvents = events.filter((e) => isSameDay(e.date, d));
              const placed = layout(dayEvents);
              return (
                <div key={d.toISOString()} className="flex-1 min-w-0 relative border-r border-slate-100 last:border-r-0">
                  {hours.map((h) => (
                    <button
                      key={h}
                      onClick={() => onSelectSlot(d, `${String(h).padStart(2, "0")}:00`)}
                      style={{ height: HOUR_PX }}
                      className="w-full border-b border-slate-50 hover:bg-violet-50/40 transition-colors"
                      aria-label={`Agendar el ${format(d, "d 'de' MMMM", { locale: es })} a las ${h}:00`}
                    />
                  ))}

                  {placed.map(({ ev, col, cols }, i) => {
                    const top = (toMinutes(ev.time) - startHour * 60) * (HOUR_PX / 60);
                    const height = Math.max(22, (ev.duration || 45) * (HOUR_PX / 60) - 2);
                    const width = 100 / cols;
                    const cancelled = ev.status === "cancelada";
                    return (
                      <button
                        key={ev.id ?? i}
                        onClick={() => onSelectEvent(ev)}
                        style={{ top, height, left: `${col * width}%`, width: `calc(${width}% - 3px)` }}
                        className={`absolute mx-[2px] rounded-lg border-l-4 px-1.5 py-1 text-left overflow-hidden shadow-sm transition-all hover:shadow-md ${
                          cancelled ? "bg-slate-300 border-slate-400 opacity-60 line-through" : typeStyles[ev.type] ?? "bg-violet-500 border-violet-600"
                        }`}
                      >
                        <p className="text-[10px] sm:text-[11px] font-bold text-white leading-tight truncate">{ev.time}</p>
                        <p className="text-[10px] sm:text-[11px] font-semibold text-white leading-tight truncate">{ev.title}</p>
                        {height > 48 && <p className="text-[10px] text-white/80 truncate">{ev.duration} min</p>}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {/* Línea de la hora actual */}
            {showNowLine && (
              <div className="absolute right-0 pointer-events-none z-10" style={{ top: nowOffset, left: GUTTER_PX }}>
                <div className="h-px bg-rose-500 relative">
                  <span className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-rose-500" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
