"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Bell, Plus, RefreshCw, Calendar, Clock, Trash2, Edit2, CheckCircle2, X, AlertCircle } from "lucide-react";

interface Reminder {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  type: "cita" | "tarea" | "general" | "pago";
  done: boolean;
}

const typeConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  cita: { label: "Cita", color: "text-violet-700", bg: "bg-violet-100", dot: "bg-violet-500" },
  tarea: { label: "Tarea", color: "text-blue-700", bg: "bg-blue-100", dot: "bg-blue-500" },
  general: { label: "General", color: "text-slate-600", bg: "bg-slate-100", dot: "bg-slate-400" },
  pago: { label: "Pago", color: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-500" },
};

const initial: Reminder[] = [
  { id: 1, title: "Confirmar cita de María González", description: "Llamar o enviar mensaje para confirmar la sesión del lunes", date: "24 Mar 2026", time: "09:00", type: "cita", done: false },
  { id: 2, title: "Completar informe mensual", description: "Subir resumen de sesiones al sistema antes del cierre", date: "31 Mar 2026", time: "17:00", type: "tarea", done: false },
  { id: 3, title: "Renovar materiales terapéuticos", description: "Comprar arcilla, pinturas y materiales de estimulación sensorial", date: "05 Abr 2026", time: "10:00", type: "general", done: false },
];

export default function RecordatoriosPage() {
  const [reminders, setReminders] = useState<Reminder[]>(initial);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", date: "", time: "", type: "general" as Reminder["type"] });

  const toggleDone = (id: number) =>
    setReminders((r) => r.map((rem) => rem.id === id ? { ...rem, done: !rem.done } : rem));

  const deleteReminder = (id: number) =>
    setReminders((r) => r.filter((rem) => rem.id !== id));

  const addReminder = () => {
    if (!form.title.trim()) return;
    setReminders((r) => [...r, { ...form, id: Date.now(), done: false }]);
    setForm({ title: "", description: "", date: "", time: "", type: "general" });
    setShowNew(false);
  };

  const pending = reminders.filter((r) => !r.done);
  const done = reminders.filter((r) => r.done);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-xl transition-all text-slate-500 hover:text-slate-700">
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-500">{pending.length} recordatorio{pending.length !== 1 ? "s" : ""} pendiente{pending.length !== 1 ? "s" : ""}</span>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30"
        >
          <Plus className="w-4 h-4" /> Nuevo Recordatorio
        </button>
      </div>

      {/* Empty state */}
      {reminders.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-slate-300" />
          </div>
          <p className="font-semibold text-slate-500">Sin recordatorios futuros</p>
          <p className="text-sm text-slate-400 mt-1">Crea recordatorios futuros y aparecerán aquí</p>
        </motion.div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Pendientes</h3>
          <div className="space-y-3">
            <AnimatePresence>
              {pending.map((rem) => {
                const t = typeConfig[rem.type];
                return (
                  <motion.div
                    key={rem.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="bg-white rounded-2xl border border-slate-200/60 p-5 hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/5 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleDone(rem.id)}
                        className="mt-0.5 w-5 h-5 rounded-lg border-2 border-slate-300 hover:border-violet-400 flex items-center justify-center transition-all shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-slate-800 text-sm">{rem.title}</h3>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                            <button className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteReminder(rem.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {rem.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{rem.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-3">
                          <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg ${t.bg} ${t.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                            {t.label}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" /> {rem.date}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="w-3 h-3" /> {rem.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Completados</h3>
          <div className="space-y-2">
            {done.map((rem) => (
              <div
                key={rem.id}
                className="bg-white/60 rounded-2xl border border-slate-200/40 p-4 opacity-60 flex items-center gap-4"
              >
                <button onClick={() => toggleDone(rem.id)}>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-600 line-through">{rem.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{rem.date} · {rem.time}</p>
                </div>
                <button
                  onClick={() => deleteReminder(rem.id)}
                  className="text-slate-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New reminder modal */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowNew(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Nuevo Recordatorio</h3>
                <button
                  onClick={() => setShowNew(false)}
                  className="w-8 h-8 hover:bg-slate-100 rounded-xl flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Título</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Ej. Llamar a paciente..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Descripción</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Detalles adicionales..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1.5">Fecha</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1.5">Hora</label>
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as Reminder["type"] })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
                  >
                    <option value="general">General</option>
                    <option value="cita">Cita</option>
                    <option value="tarea">Tarea</option>
                    <option value="pago">Pago</option>
                  </select>
                </div>
              </div>
              <div className="px-6 pb-6">
                <button
                  onClick={addReminder}
                  className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30"
                >
                  Crear Recordatorio
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
