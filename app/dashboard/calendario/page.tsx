"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, CheckSquare } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface CalEvent {
  id?: number;
  date: Date;
  title: string;
  time: string;
  type: string;
  location: string;
}

interface CalTask {
  id: number;
  title: string;
  due: string;
  patient?: string;
  priority: string;
  status: string;
}

const typeColors: Record<string, string> = {
  sesion: "bg-violet-200 text-violet-900 border-violet-300",
  evaluacion: "bg-blue-200 text-blue-900 border-blue-300",
  reunion: "bg-emerald-200 text-emerald-900 border-emerald-300",
  grupal: "bg-amber-200 text-amber-900 border-amber-300",
};

const typeDots: Record<string, string> = {
  sesion: "bg-violet-600",
  evaluacion: "bg-blue-600",
  reunion: "bg-emerald-600",
  grupal: "bg-amber-600",
};

export default function CalendarioPage() {
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(new Date());
  const [localEvents, setLocalEvents] = useState<CalEvent[]>([]);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", date: "", time: "10:00", type: "sesion", location: "Sala 1" });
  const [patients, setPatients] = useState<{ id: number; name: string }[]>([]);
  const [tasks, setTasks] = useState<CalTask[]>([]);

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then((data) => setPatients(Array.isArray(data) ? data.map((p: { id: number; name: string }) => ({ id: p.id, name: p.name })) : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/appointments")
      .then((r) => r.json())
      .then((data: { id: number; date: string; title: string; time: string; type: string; location: string }[]) => {
        const list = Array.isArray(data) ? data : [];
        setLocalEvents(
          list.map((a) => {
            const [y, m, d] = a.date.split("-").map(Number);
            return { id: a.id, date: new Date(y, m - 1, d), title: a.title, time: a.time, type: a.type, location: a.location };
          })
        );
      })
      .catch(() => {});
  }, []);

  const openNewEvent = (type = "sesion") => {
    const defaultDate = selected
      ? format(selected, "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd");
    setNewEvent({ title: "", date: defaultDate, time: "10:00", type, location: "Sala 1" });
    setShowNewEvent(true);
  };

  const addEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date) return;
    const [y, m, d] = newEvent.date.split("-").map(Number);
    const eventDate = new Date(y, m - 1, d);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newEvent.title, date: newEvent.date, time: newEvent.time, type: newEvent.type, location: newEvent.location }),
    });
    if (res.ok) {
      const saved = await res.json();
      setLocalEvents((prev: CalEvent[]) => [...prev, { id: saved.id, date: eventDate, title: newEvent.title, time: newEvent.time, type: newEvent.type, location: newEvent.location }]);
      setSelected(eventDate);
      setCurrent(new Date(y, m - 1, 1));
      setNewEvent({ title: "", date: "", time: "10:00", type: "sesion", location: "Sala 1" });
      setShowNewEvent(false);
    }
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

  const selectedTasks = selected
    ? tasks.filter((t) => t.due && isSameDay(new Date(t.due + "T00:00:00"), selected) && t.status !== "completada")
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
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => openNewEvent("sesion")} className="flex items-center gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-3 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30">
            <Plus className="w-4 h-4" /> Sesión
          </button>
          <button onClick={() => openNewEvent("evaluacion")} className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-2.5 rounded-xl font-medium text-sm hover:from-blue-400 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/30">
            <Plus className="w-4 h-4" /> Evaluación
          </button>
          <button onClick={() => openNewEvent("reunion")} className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-2.5 rounded-xl font-medium text-sm hover:from-emerald-400 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/30">
            <Plus className="w-4 h-4" /> Reunión
          </button>
        </div>
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
              const dayTasks = tasks.filter((t) => t.due && isSameDay(new Date(t.due + "T00:00:00"), day) && t.status !== "completada");
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
                    {dayTasks.slice(0, dayEvents.length >= 2 ? 0 : 1).map((t, ti) => (
                      <div key={ti} className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate border bg-slate-100 text-slate-700 border-slate-300">
                        ✓ {t.title.split(" ")[0]}
                      </div>
                    ))}
                    {dayEvents.length + dayTasks.length > 2 && (
                      <div className="text-[10px] text-slate-400 font-medium pl-1">
                        +{dayEvents.length + dayTasks.length - 2} más
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

          {selectedEvents.length === 0 && selectedTasks.length === 0 ? (
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
              {selectedTasks.length > 0 && (
                <>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide pt-1">Tareas pendientes</p>
                  {selectedTasks.map((t) => (
                    <div key={t.id} className="p-3.5 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/40 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${
                          t.priority === "alta" ? "bg-red-50 text-red-600 border-red-200" :
                          t.priority === "media" ? "bg-amber-50 text-amber-600 border-amber-200" :
                          "bg-emerald-50 text-emerald-600 border-emerald-200"
                        } capitalize`}>{t.priority}</span>
                        <CheckSquare className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">{t.title}</p>
                      {t.patient && <p className="text-xs text-slate-400 mt-1">{t.patient}</p>}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          <button onClick={openNewEvent} className="mt-4 w-full text-sm font-medium text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Agregar cita
          </button>
        </motion.div>
      </div>

      {/* New Event Modal */}
      <Modal
        open={showNewEvent}
        onClose={() => setShowNewEvent(false)}
        title="Nueva Cita"
        footer={
          <button onClick={addEvent} disabled={!newEvent.title.trim() || !newEvent.date} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30">
            Crear Cita
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Fecha *</label>
            <input autoFocus type="date" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Paciente *</label>
            {patients.length > 0 ? (
              <select value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white">
                <option value="">Seleccionar paciente...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            ) : (
              <input type="text" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Nombre del paciente" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Hora</label>
              <input type="time" value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tipo</label>
              <select value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white">
                <option value="sesion">Sesión</option>
                <option value="evaluacion">Evaluación</option>
                <option value="reunion">Reunión</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Sala / Ubicación</label>
            <input type="text" value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} placeholder="Ej. Sala 1" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
