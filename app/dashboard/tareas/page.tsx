"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Plus, Check, Clock, AlertCircle, Trash2, ArrowUpDown, Pencil } from "lucide-react";
import Modal from "@/components/ui/Modal";

type Priority = "alta" | "media" | "baja";
type Status = "pendiente" | "en_progreso" | "completada";

interface Task {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  due: string;
  patient?: string;
  category: string;
}

const priorityConfig: Record<Priority, { label: string; badge: string }> = {
  alta: { label: "Alta", badge: "bg-red-50 text-red-600 border-red-200" },
  media: { label: "Media", badge: "bg-amber-50 text-amber-600 border-amber-200" },
  baja: { label: "Baja", badge: "bg-emerald-50 text-emerald-600 border-emerald-200" },
};

const initialTasks: Task[] = [];

export default function TareasPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [patients, setPatients] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"todas" | Status>("todas");
  const [sortAsc, setSortAsc] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "media" as Priority, due: "", patient: "", category: "Clínico" });

  useEffect(() => {
    let email = "";
    try {
      const stored = localStorage.getItem("currentUser");
      if (stored) email = JSON.parse(stored).email || "";
    } catch { /* ignore */ }
    Promise.all([
      fetch(`/api/tasks?createdBy=${encodeURIComponent(email)}`),
      fetch(`/api/patients?createdBy=${encodeURIComponent(email)}`),
    ])
      .then(([r1, r2]) => Promise.all([r1.json(), r2.json()]))
      .then(([tasksData, patientsData]) => {
        setTasks(Array.isArray(tasksData) ? tasksData : []);
        setPatients(Array.isArray(patientsData) ? patientsData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    let createdBy = "";
    try {
      const stored = localStorage.getItem("currentUser");
      if (stored) createdBy = JSON.parse(stored).email || "";
    } catch { /* ignore */ }
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newTask, status: "pendiente" as Status, patientName: newTask.patient, createdBy }),
    });
    if (res.ok) {
      const task = await res.json();
      setTasks((prev) => [...prev, task]);
      setNewTask({ title: "", description: "", priority: "media", due: "", patient: "", category: "Clínico" });
      setShowNewTask(false);
      setFilter("todas");
    }
  };

  const toggleStatus = async (id: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.status === "completada" ? "pendiente" : "completada";
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus as Status } : t));
    await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const deleteTask = async (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  };

  const saveEdit = async () => {
    if (!editingTask) return;
    setTasks((prev) => prev.map((t) => t.id === editingTask.id ? editingTask : t));
    await fetch(`/api/tasks/${editingTask.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingTask),
    });
    setEditingTask(null);
  };

  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const getDueMeta = (due: string | undefined, status: Status) => {
    if (!due || status === "completada") return { label: due ?? "", cls: "text-slate-500" };
    const d = new Date(due + "T00:00:00");
    if (d < today) return { label: "Atrasada", cls: "text-red-600 font-semibold" };
    if (d.getTime() === today.getTime()) return { label: "Hoy", cls: "text-orange-500 font-semibold" };
    if (d.getTime() === tomorrow.getTime()) return { label: "Mañana", cls: "text-orange-400 font-semibold" };
    return { label: due, cls: "text-slate-500" };
  };

  const filtered = (filter === "todas" ? tasks : tasks.filter((t) => t.status === filter))
    .slice()
    .sort((a, b) => {
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return sortAsc
        ? a.due.localeCompare(b.due)
        : b.due.localeCompare(a.due);
    });

  const counts = {
    pendiente: tasks.filter((t) => t.status === "pendiente").length,
    en_progreso: tasks.filter((t) => t.status === "en_progreso").length,
    completada: tasks.filter((t) => t.status === "completada").length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">{tasks.length} tareas en total</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortAsc(!sortAsc)}
            title={sortAsc ? "Más lejanas primero" : "Más próximas primero"}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-600 text-xs font-medium transition-all"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortAsc ? "Próximas primero" : "Lejanas primero"}
          </button>
          <button
            onClick={() => setShowNewTask(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30"
          >
            <Plus className="w-4 h-4" /> Nueva Tarea
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: "pendiente" as Status, label: "Pendientes", value: counts.pendiente, color: "text-amber-600" },
          { key: "en_progreso" as Status, label: "En Progreso", value: counts.en_progreso, color: "text-blue-600" },
          { key: "completada" as Status, label: "Completadas", value: counts.completada, color: "text-emerald-600" },
        ].map((s) => (
          <motion.button
            key={s.key}
            whileHover={{ y: -1 }}
            onClick={() => setFilter(filter === s.key ? "todas" : s.key)}
            className={`rounded-2xl border p-4 text-center transition-all ${
              filter === s.key ? "border-violet-300 bg-violet-50 shadow-md" : "bg-white border-slate-200/60 hover:border-violet-200"
            }`}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </motion.button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 bg-white border border-slate-200/60 rounded-2xl p-1.5">
        {[
          { key: "todas", label: "Todas" },
          { key: "pendiente", label: "Pendientes" },
          { key: "en_progreso", label: "En Progreso" },
          { key: "completada", label: "Completadas" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f.key
                ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/25"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((task) => {
            const pConf = priorityConfig[task.priority];
            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`bg-white rounded-2xl border border-slate-200/60 p-4 hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/5 transition-all group ${
                  task.status === "completada" ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleStatus(task.id)}
                    className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                      task.status === "completada"
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-slate-300 hover:border-violet-400"
                    }`}
                  >
                    {task.status === "completada" && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-sm font-semibold text-slate-800 ${task.status === "completada" ? "line-through text-slate-400" : ""}`}>
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => setEditingTask(task)}
                          className="p-1 text-slate-300 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-all shrink-0"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{task.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${pConf.badge}`}>
                        {pConf.label}
                      </span>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">{task.category}</span>
                      {task.patient && (
                        <span className="text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg">{task.patient}</span>
                      )}
                      {task.due && (() => { const m = getDueMeta(task.due, task.status); return (
                        <span className={`ml-auto flex items-center gap-1 text-xs ${m.cls}`}>
                          <Clock className="w-3 h-3" /> {m.label}
                        </span>
                      ); })()}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Check className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p className="font-medium">No hay tareas en esta categoría</p>
          </div>
        )}
      </div>

      {/* Nueva Tarea Modal */}
      <Modal
        open={showNewTask}
        onClose={() => setShowNewTask(false)}
        title="Nueva Tarea"
        footer={
          <button
            onClick={addTask}
            disabled={!newTask.title.trim()}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30"
          >
            Crear Tarea
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Título *</label>
            <input
              autoFocus
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Ej. Redactar informe de paciente..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Descripción</label>
            <textarea
              rows={2}
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Detalles de la tarea..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Prioridad</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Priority })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Categoría</label>
              <select
                value={newTask.category}
                onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
              >
                <option>Clínico</option>
                <option>Documentación</option>
                <option>Preparación</option>
                <option>Comunicación</option>
                <option>Administrativo</option>
                <option>Planificación</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Fecha límite</label>
              <input
                type="date"
                value={newTask.due}
                onChange={(e) => setNewTask({ ...newTask, due: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Usuario</label>
              <select
                value={newTask.patient}
                onChange={(e) => setNewTask({ ...newTask, patient: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
              >
                <option value="">Sin usuario asignado</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Editar Tarea Modal */}
      <Modal
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Editar Tarea"
        footer={
          <button
            onClick={saveEdit}
            disabled={!editingTask?.title.trim()}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30"
          >
            Guardar Cambios
          </button>
        }
      >
        {editingTask && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Título *</label>
              <input
                autoFocus
                type="text"
                value={editingTask.title}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Descripción</label>
              <textarea
                rows={2}
                value={editingTask.description}
                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Prioridad</label>
                <select
                  value={editingTask.priority}
                  onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as Priority })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
                >
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Categoría</label>
                <select
                  value={editingTask.category}
                  onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
                >
                  <option>Clínico</option>
                  <option>Documentación</option>
                  <option>Preparación</option>
                  <option>Comunicación</option>
                  <option>Administrativo</option>
                  <option>Planificación</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Fecha límite</label>
                <input
                  type="date"
                  value={editingTask.due ?? ""}
                  onChange={(e) => setEditingTask({ ...editingTask, due: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Usuario</label>
                <select
                  value={editingTask.patient ?? ""}
                  onChange={(e) => setEditingTask({ ...editingTask, patient: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
                >
                  <option value="">Sin usuario asignado</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
