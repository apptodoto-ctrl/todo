"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Plus, Check, Clock, AlertCircle, Trash2, MoreVertical } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { initialPatients } from "@/lib/patientsData";

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

const initialTasks: Task[] = [
  { id: 1, title: "Redactar informe inicial de María G.", description: "Completar evaluación inicial y documentar diagnóstico", priority: "alta", status: "pendiente", due: "Hoy", patient: "María González", category: "Documentación" },
  { id: 2, title: "Revisar plan de tratamiento Carlos M.", description: "Actualizar objetivos de la semana 8", priority: "alta", status: "en_progreso", due: "Hoy", patient: "Carlos Morales", category: "Clínico" },
  { id: 3, title: "Preparar materiales sesión Sofía R.", description: "Actividades de coordinación motora fina", priority: "media", status: "pendiente", due: "Mañana", patient: "Sofía Reyes", category: "Preparación" },
  { id: 4, title: "Enviar recordatorio a Pedro V.", description: "Confirmar cita del martes", priority: "baja", status: "completada", due: "Ayer", patient: "Pedro Vargas", category: "Comunicación" },
  { id: 5, title: "Actualizar tabla de factores pipeline", description: "Mover casos de semana 4 a intervención", priority: "media", status: "pendiente", due: "Vie 28", category: "Administrativo" },
  { id: 6, title: "Subir documentos a biblioteca", description: "Protocolos actualizados de evaluación", priority: "baja", status: "pendiente", due: "Próx. semana", category: "Documentación" },
  { id: 7, title: "Crear cuento terapéutico para Ana T.", description: "Historia para exposición gradual", priority: "alta", status: "completada", due: "Completada", patient: "Ana Torres", category: "Clínico" },
];

const priorityConfig: Record<Priority, { label: string; badge: string }> = {
  alta: { label: "Alta", badge: "bg-red-50 text-red-600 border-red-200" },
  media: { label: "Media", badge: "bg-amber-50 text-amber-600 border-amber-200" },
  baja: { label: "Baja", badge: "bg-emerald-50 text-emerald-600 border-emerald-200" },
};

export default function TareasPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filter, setFilter] = useState<"todas" | Status>("todas");
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "media" as Priority, due: "", patient: "", category: "Clínico" });

  const addTask = () => {
    if (!newTask.title.trim()) return;
    setTasks((prev) => [...prev, { ...newTask, id: Date.now(), status: "pendiente" as Status }]);
    setNewTask({ title: "", description: "", priority: "media", due: "", patient: "", category: "Clínico" });
    setShowNewTask(false);
    setFilter("todas");
  };

  const toggleStatus = (id: number) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === "completada" ? "pendiente" : "completada" } : t
      )
    );
  };

  const deleteTask = (id: number) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const filtered = filter === "todas" ? tasks : tasks.filter((t) => t.status === filter);

  const counts = {
    pendiente: tasks.filter((t) => t.status === "pendiente").length,
    en_progreso: tasks.filter((t) => t.status === "en_progreso").length,
    completada: tasks.filter((t) => t.status === "completada").length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{tasks.length} tareas en total</p>
        <button
          onClick={() => setShowNewTask(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30"
        >
          <Plus className="w-4 h-4" /> Nueva Tarea
        </button>
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
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${pConf.badge}`}>
                        {pConf.label}
                      </span>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">{task.category}</span>
                      {task.patient && (
                        <span className="text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg">{task.patient}</span>
                      )}
                      {task.due && (
                        <span className="ml-auto flex items-center gap-1 text-xs text-slate-400 font-medium">
                          <Clock className="w-3 h-3" /> {task.due}
                        </span>
                      )}
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
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Descripción</label>
            <textarea
              rows={2}
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Detalles de la tarea..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Prioridad</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Priority })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
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
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
              >
                <option>Clínico</option>
                <option>Documentación</option>
                <option>Preparación</option>
                <option>Comunicación</option>
                <option>Administrativo</option>
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
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Paciente</label>
              <select
                value={newTask.patient}
                onChange={(e) => setNewTask({ ...newTask, patient: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
              >
                <option value="">Sin paciente asignado</option>
                {initialPatients.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
