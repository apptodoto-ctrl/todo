"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Bell, Plus, RefreshCw, Calendar, Clock, Trash2, Edit2, CheckCircle2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useCurrentUser } from "@/lib/useCurrentUser";

interface Reminder {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  type: string;
  done: boolean;
}

const typeConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  cita: { label: "Cita", color: "text-violet-700", bg: "bg-violet-100", dot: "bg-violet-500" },
  tarea: { label: "Tarea", color: "text-blue-700", bg: "bg-blue-100", dot: "bg-blue-500" },
  general: { label: "General", color: "text-slate-600", bg: "bg-slate-100", dot: "bg-slate-400" },
  pago: { label: "Pago", color: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-500" },
};

const getTypeConfig = (type: string) => typeConfig[type] ?? typeConfig.general;

export default function RecordatoriosPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [form, setForm] = useState({ title: "", description: "", date: "", time: "", type: "general" });
  const { email: currentUserEmail } = useCurrentUser();

  const loadReminders = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders");
      const data = await res.json();
      if (Array.isArray(data)) setReminders(data);
    } catch { /* keep current list */ }
  }, []);

  useEffect(() => {
    if (!currentUserEmail) return;
    // Migración única: recordatorios que quedaron en localStorage pasan a la BD
    const migrate = async () => {
      try {
        const stored = localStorage.getItem("reminders");
        if (stored) {
          const local: Partial<Reminder>[] = JSON.parse(stored);
          for (const r of local) {
            if (!r.title) continue;
            await fetch("/api/reminders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: r.title, description: r.description, date: r.date, time: r.time, type: r.type }),
            });
          }
          localStorage.removeItem("reminders");
        }
      } catch { /* si falla la migración, se muestra lo que haya en BD */ }
      await loadReminders();
    };
    migrate();
  }, [currentUserEmail, loadReminders]);

  const refresh = async () => {
    setRefreshing(true);
    await loadReminders();
    setRefreshing(false);
  };

  const toggleDone = async (rem: Reminder) => {
    setReminders((r) => r.map((x) => (x.id === rem.id ? { ...x, done: !x.done } : x)));
    const res = await fetch(`/api/reminders/${rem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !rem.done }),
    });
    if (!res.ok) setReminders((r) => r.map((x) => (x.id === rem.id ? { ...x, done: rem.done } : x)));
  };

  const deleteReminder = async (id: number) => {
    const prev = reminders;
    setReminders((r) => r.filter((rem) => rem.id !== id));
    const res = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    if (!res.ok) setReminders(prev);
  };

  const addReminder = async () => {
    if (!form.title.trim()) return;
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) return;
    const created: Reminder = await res.json();
    setReminders((r) => [...r, created]);
    setForm({ title: "", description: "", date: "", time: "", type: "general" });
    setShowNew(false);

    // Notificación por email al terapeuta
    try {
      await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: currentUserEmail,
          subject: `Recordatorio: ${created.title}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:24px;border-radius:12px 12px 0 0;">
                <h1 style="color:white;margin:0;font-size:20px;">🔔 Nuevo Recordatorio</h1>
              </div>
              <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
                <h2 style="color:#1e293b;margin:0 0 8px;">${created.title}</h2>
                ${created.description ? `<p style="color:#64748b;margin:0 0 16px;">${created.description}</p>` : ""}
                <div style="display:flex;gap:12px;flex-wrap:wrap;">
                  ${created.date ? `<span style="background:#ede9fe;color:#7c3aed;padding:4px 12px;border-radius:8px;font-size:14px;">📅 ${created.date}</span>` : ""}
                  ${created.time ? `<span style="background:#ede9fe;color:#7c3aed;padding:4px 12px;border-radius:8px;font-size:14px;">⏰ ${created.time}</span>` : ""}
                  <span style="background:#ede9fe;color:#7c3aed;padding:4px 12px;border-radius:8px;font-size:14px;">${getTypeConfig(created.type).label}</span>
                </div>
              </div>
            </div>
          `,
        }),
      });
    } catch {
      // Email failure is silent — reminder is still saved
    }
  };

  const saveEdit = async () => {
    if (!editingReminder) return;
    const res = await fetch(`/api/reminders/${editingReminder.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editingReminder.title,
        description: editingReminder.description,
        date: editingReminder.date,
        time: editingReminder.time,
        type: editingReminder.type,
      }),
    });
    if (res.ok) {
      const updated: Reminder = await res.json();
      setReminders((r) => r.map((rem) => (rem.id === updated.id ? updated : rem)));
      setEditingReminder(null);
    }
  };

  const pending = reminders.filter((r) => !r.done);
  const done = reminders.filter((r) => r.done);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={refresh} className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-xl transition-all text-slate-500 hover:text-slate-700">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
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
                const t = getTypeConfig(rem.type);
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
                        onClick={() => toggleDone(rem)}
                        className="mt-0.5 w-5 h-5 rounded-lg border-2 border-slate-300 hover:border-violet-400 flex items-center justify-center transition-all shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-slate-800 text-sm">{rem.title}</h3>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                            <button onClick={() => setEditingReminder(rem)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
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
                          {rem.date && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Calendar className="w-3 h-3" /> {rem.date}
                            </span>
                          )}
                          {rem.time && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="w-3 h-3" /> {rem.time}
                            </span>
                          )}
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
                <button onClick={() => toggleDone(rem)}>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-600 line-through">{rem.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{rem.date}{rem.time ? ` · ${rem.time}` : ""}</p>
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

      {/* New Reminder Modal */}
      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="Nuevo Recordatorio"
        footer={
          <button onClick={addReminder} disabled={!form.title.trim()} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30">
            Crear Recordatorio
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Título *</label>
            <input autoFocus type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej. Llamar a paciente..." className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Descripción</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalles adicionales..." className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Fecha</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Hora</label>
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tipo</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white">
              <option value="general">General</option>
              <option value="cita">Cita</option>
              <option value="tarea">Tarea</option>
              <option value="pago">Pago</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Editar Recordatorio Modal */}
      <Modal
        open={!!editingReminder}
        onClose={() => setEditingReminder(null)}
        title="Editar Recordatorio"
        footer={
          <button onClick={saveEdit} disabled={!editingReminder?.title.trim()} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30">
            Guardar Cambios
          </button>
        }
      >
        {editingReminder && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Título *</label>
              <input autoFocus type="text" value={editingReminder.title} onChange={(e) => setEditingReminder({ ...editingReminder, title: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Descripción</label>
              <textarea rows={2} value={editingReminder.description} onChange={(e) => setEditingReminder({ ...editingReminder, description: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Fecha</label>
                <input type="date" value={editingReminder.date} onChange={(e) => setEditingReminder({ ...editingReminder, date: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Hora</label>
                <input type="time" value={editingReminder.time} onChange={(e) => setEditingReminder({ ...editingReminder, time: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tipo</label>
              <select value={editingReminder.type} onChange={(e) => setEditingReminder({ ...editingReminder, type: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white">
                <option value="general">General</option>
                <option value="cita">Cita</option>
                <option value="tarea">Tarea</option>
                <option value="pago">Pago</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
