"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, User, MapPin } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const events = [
  { date: new Date(2026, 2, 22), title: "María González", time: "10:00", type: "sesion", location: "Sala 1" },
  { date: new Date(2026, 2, 22), title: "Carlos Morales", time: "14:30", type: "sesion", location: "Sala 2" },
  { date: new Date(2026, 2, 23), title: "Sofía Reyes", time: "09:00", type: "evaluacion", location: "Sala 1" },
  { date: new Date(2026, 2, 24), title: "Pedro Vargas", time: "11:00", type: "sesion", location: "Sala 3" },
  { date: new Date(2026, 2, 25), title: "Reunión equipo", time: "16:00", type: "reunion", location: "Sala conf." },
  { date: new Date(2026, 2, 27), title: "Ana Torres", time: "10:30", type: "sesion", location: "Sala 2" },
  { date: new Date(2026, 2, 27), title: "Luis Campos", time: "12:00", type: "evaluacion", location: "Sala 1" },
];

const typeColors: Record<string, string> = {
  sesion: "bg-violet-100 text-violet-700 border-violet-200",
  evaluacion: "bg-blue-100 text-blue-700 border-blue-200",
  reunion: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const typeDots: Record<string, string> = {
  sesion: "bg-violet-500",
  evaluacion: "bg-blue-500",
  reunion: "bg-emerald-500",
};

export default function CalendarioPage() {
  const [current, setCurrent] = useState(new Date(2026, 2, 1));
  const [selected, setSelected] = useState<Date | null>(new Date(2026, 2, 22));

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // pad to start on Monday
  const startDay = (monthStart.getDay() + 6) % 7;
  const paddedDays = [...Array(startDay).fill(null), ...days];

  const selectedEvents = selected
    ? events.filter((e) => isSameDay(e.date, selected))
    : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrent(subMonths(current, 1))}
            className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <h2 className="text-lg font-bold text-slate-800 min-w-[180px] text-center capitalize">
            {format(current, "MMMM yyyy", { locale: es })}
          </h2>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm transition-all"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30">
          <Plus className="w-4 h-4" /> Nueva Cita
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 overflow-hidden"
        >
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS.map((d) => (
              <div key={d} className="py-3 text-center text-xs font-semibold text-slate-400">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {paddedDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="h-24 border-r border-b border-slate-50" />;
              const isToday = isSameDay(day, new Date(2026, 2, 22));
              const isSelected = selected && isSameDay(day, selected);
              const dayEvents = events.filter((e) => isSameDay(e.date, day));
              const inMonth = isSameMonth(day, current);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelected(day)}
                  className={`h-24 p-2 border-r border-b border-slate-50 text-left transition-all hover:bg-violet-50/50 ${
                    !inMonth ? "opacity-30" : ""
                  } ${isSelected ? "bg-violet-50 border-violet-200" : ""}`}
                >
                  <span
                    className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-lg ${
                      isToday
                        ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/30"
                        : isSelected
                        ? "text-violet-700 font-bold"
                        : "text-slate-600"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((ev, ei) => (
                      <div
                        key={ei}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate border ${typeColors[ev.type]}`}
                      >
                        {ev.time} {ev.title.split(" ")[0]}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-slate-400 font-medium pl-1">
                        +{dayEvents.length - 2} más
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Events panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200/60 p-5"
        >
          <h3 className="font-semibold text-slate-800 mb-4">
            {selected
              ? format(selected, "EEEE d 'de' MMMM", { locale: es })
              : "Selecciona un día"}
          </h3>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(typeDots).map(([key, dot]) => (
              <span key={key} className="flex items-center gap-1.5 text-xs text-slate-500 capitalize">
                <span className={`w-2 h-2 rounded-full ${dot}`} /> {key}
              </span>
            ))}
          </div>

          {selectedEvents.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              <p className="text-sm">Sin eventos este día</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((ev, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/40 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${typeColors[ev.type]} capitalize`}>
                      {ev.type}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{ev.time}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">{ev.title}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {ev.location}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="mt-4 w-full text-sm font-medium text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Agregar cita
          </button>
        </motion.div>
      </div>
    </div>
  );
}
