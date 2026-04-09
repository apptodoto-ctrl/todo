"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, User, MapPin, X } from "lucide-react";
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
  const [localEvents, setLocalEvents] = useState(events);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", date: "", time: "10:00", type: "sesion", location: "Sala 1" });

  const openNewEvent = () => {
    const defaultDate = selected
      ? format(selected, "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd");
    setNewEvent({ title: "", date: defaultDate, time: "10:00", type: "sesion", location: "Sala 1" });
    setShowNewEvent(true);
  };

  const addEvent = () => {
    if (!newEvent.title.trim() || !newEvent.date) return;
    const [y, m, d] = newEvent.date.split("-").map(Number);
    const eventDate = new Date(y, m - 1, d);
    setLocalEvents((prev) => [...prev, { date: eventDate, title: newEvent.title, time: newEvent.time, type: newEvent.type, location: newEvent.location }]);
    setSelected(eventDate);
    setCurrent(new Date(y, m - 1, 1));
    setNewEvent({ title: "", date: "", time: "10:00", type: "sesion", location: "Sala 1" });
    setShowNewEvent(false);
  };

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // pad to start on Monday
  const startDay = (monthStart.getDay() + 6) % 7;
  const paddedDays = [...Array(startDay).fill(null), ...days];

  const selectedEvents = selected
    ? localEvents.filter((e) => isSameDay(e.date, selected))
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
        <button onClick={openNewEvent} className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30">
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
              const dayEvents = localEvents.filter((e) => isSameDay(e.date, day));
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

          <button onClick={openNewEvent} className="mt-4 w-full text-sm font-medium text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Agregar cita
          </button>
        </motion.div>
      </div>

      {/* New Event Modal */}
      <AnimatePresence>
        {showNewEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowNewEvent(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Nueva Cita</h3>
                <button onClick={() => setShowNewEvent(false)} className="w-8 h-8 hover:bg-slate-100 rounded-xl flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Fecha *</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Paciente / Título *</label>
                  <input type="text" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Nombre del paciente o razón" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1.5">Hora</label>
                    <input type="time" value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tipo</label>
                    <select value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white">
                      <option value="sesion">Sesión</option>
                      <option value="evaluacion">Evaluación</option>
                      <option value="reunion">Reunión</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Sala / Ubicación</label>
                  <input type="text" value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} placeholder="Ej. Sala 1" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
                </div>
              </div>
              <div className="px-6 pb-6">
                <button onClick={addEvent} disabled={!newEvent.title.trim()} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30">
                  Crear Cita
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
