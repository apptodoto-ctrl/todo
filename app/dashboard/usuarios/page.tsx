"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Plus, Search, Phone, Mail, MoreVertical, Calendar, ClipboardList, User, Activity, Hash } from "lucide-react";
import Modal from "@/components/ui/Modal";

const initialPatients = [
  { id: 1, name: "María González", age: 8, diagnosis: "TEA", therapist: "Josefina P.", sessions: 12, nextSession: "22 Mar 10:00", status: "activo", initials: "MG", color: "from-violet-500 to-purple-600" },
  { id: 2, name: "Carlos Morales", age: 45, diagnosis: "ACV", therapist: "Josefina P.", sessions: 8, nextSession: "22 Mar 14:30", status: "activo", initials: "CM", color: "from-blue-500 to-indigo-600" },
  { id: 3, name: "Sofía Reyes", age: 6, diagnosis: "Desarrollo Motor", therapist: "Josefina P.", sessions: 5, nextSession: "23 Mar 09:00", status: "evaluacion", initials: "SR", color: "from-emerald-500 to-teal-600" },
  { id: 4, name: "Pedro Vargas", age: 67, diagnosis: "Artritis Reumatoide", therapist: "Josefina P.", sessions: 15, nextSession: "24 Mar 11:00", status: "activo", initials: "PV", color: "from-amber-500 to-orange-500" },
  { id: 5, name: "Ana Torres", age: 34, diagnosis: "Lesión Medular", therapist: "Josefina P.", sessions: 20, nextSession: "27 Mar 10:30", status: "alta", initials: "AT", color: "from-pink-500 to-rose-500" },
  { id: 6, name: "Luis Campos", age: 12, diagnosis: "TDAH", therapist: "Josefina P.", sessions: 3, nextSession: "27 Mar 12:00", status: "evaluacion", initials: "LC", color: "from-cyan-500 to-blue-500" },
];

const statusConfig: Record<string, { label: string; cls: string }> = {
  activo: { label: "Activo", cls: "bg-emerald-100 text-emerald-700" },
  evaluacion: { label: "En Evaluación", cls: "bg-blue-100 text-blue-700" },
  alta: { label: "Alta", cls: "bg-slate-100 text-slate-600" },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export default function UsuariosPage() {
  const [patients, setPatients] = useState(initialPatients);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", age: 0, diagnosis: "", status: "activo", nextSession: "" });
  const [selectedPatient, setSelectedPatient] = useState<typeof initialPatients[0] | null>(null);

  const addPatient = () => {
    if (!newPatient.name.trim() || !newPatient.diagnosis.trim()) return;
    const initials = newPatient.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
    const colors = ["from-violet-500 to-purple-600", "from-blue-500 to-indigo-600", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-500", "from-pink-500 to-rose-500"];
    const color = colors[patients.length % colors.length];
    setPatients((prev) => [...prev, { id: Date.now(), ...newPatient, therapist: "Josefina P.", sessions: 0, initials, color }]);
    setNewPatient({ name: "", age: 0, diagnosis: "", status: "activo", nextSession: "" });
    setShowNewPatient(false);
    setFilter("todos");
  };

  const filtered = patients.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.diagnosis.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "todos" || p.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-slate-500 text-sm">{patients.length} pacientes registrados</p>
        </div>
        <button onClick={() => setShowNewPatient(true)} className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Nuevo Paciente
        </button>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o diagnóstico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: "todos", label: "Todos" },
            { key: "activo", label: "Activos" },
            { key: "evaluacion", label: "Evaluación" },
            { key: "alta", label: "Alta" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                filter === f.key
                  ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/25"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pacientes activos", value: patients.filter(p => p.status === "activo").length, color: "text-emerald-600" },
          { label: "En evaluación", value: patients.filter(p => p.status === "evaluacion").length, color: "text-blue-600" },
          { label: "Dados de alta", value: patients.filter(p => p.status === "alta").length, color: "text-slate-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200/60 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Patient cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        {filtered.map((p) => (
          <motion.div
            key={p.id}
            variants={item}
            className="bg-white rounded-2xl border border-slate-200/60 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 cursor-pointer group overflow-hidden"
          >
            {/* Top bar */}
            <div className={`h-1.5 bg-gradient-to-r ${p.color}`} />

            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 bg-gradient-to-br ${p.color} rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md`}>
                    {p.initials}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{p.name}</h3>
                    <p className="text-xs text-slate-400">{p.age} años</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${statusConfig[p.status]?.cls}`}>
                    {statusConfig[p.status]?.label}
                  </span>
                  <button className="p-1 text-slate-300 hover:text-slate-600 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                  <span>{p.diagnosis}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Próxima: {p.nextSession}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-600">{p.sessions}</span> sesiones
                </div>
                <div className="flex gap-1.5">
                  <button className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all">
                    <Mail className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all">
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setSelectedPatient(p)} className="px-3 py-1.5 text-xs font-medium text-violet-600 hover:text-white hover:bg-gradient-to-r hover:from-violet-500 hover:to-purple-600 border border-violet-200 hover:border-transparent rounded-lg transition-all">
                    Ver perfil
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Profile Modal */}
      <Modal
        open={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        title="Perfil del Paciente"
        maxWidth="max-w-lg"
      >
        {selectedPatient && (
          <div className="space-y-5">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 bg-gradient-to-br ${selectedPatient.color} rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
                {selectedPatient.initials}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selectedPatient.name}</h3>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${statusConfig[selectedPatient.status]?.cls}`}>
                  {statusConfig[selectedPatient.status]?.label}
                </span>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: User, label: "Edad", value: `${selectedPatient.age} años` },
                { icon: Activity, label: "Terapeuta", value: selectedPatient.therapist },
                { icon: ClipboardList, label: "Diagnóstico", value: selectedPatient.diagnosis },
                { icon: Hash, label: "Sesiones", value: `${selectedPatient.sessions} realizadas` },
                { icon: Calendar, label: "Próxima sesión", value: selectedPatient.nextSession || "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3.5 h-3.5 text-violet-500" />
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">{value}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:border-violet-300 hover:text-violet-600 transition-all">
                <Mail className="w-4 h-4" /> Enviar email
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:border-violet-300 hover:text-violet-600 transition-all">
                <Phone className="w-4 h-4" /> Llamar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* New Patient Modal */}
      <Modal
        open={showNewPatient}
        onClose={() => setShowNewPatient(false)}
        title="Nuevo Paciente"
        footer={
          <button onClick={addPatient} disabled={!newPatient.name.trim() || !newPatient.diagnosis.trim()} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30">
            Registrar Paciente
          </button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nombre *</label>
              <input autoFocus type="text" value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} placeholder="Nombre completo" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Edad</label>
              <input type="number" min={0} max={120} value={newPatient.age || ""} onChange={(e) => setNewPatient({ ...newPatient, age: parseInt(e.target.value) || 0 })} placeholder="Años" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Diagnóstico *</label>
            <input type="text" value={newPatient.diagnosis} onChange={(e) => setNewPatient({ ...newPatient, diagnosis: e.target.value })} placeholder="Diagnóstico principal" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Estado</label>
            <select value={newPatient.status} onChange={(e) => setNewPatient({ ...newPatient, status: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white">
              <option value="activo">Activo</option>
              <option value="evaluacion">En Evaluación</option>
              <option value="alta">Alta</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Próxima sesión</label>
            <input type="text" value={newPatient.nextSession} onChange={(e) => setNewPatient({ ...newPatient, nextSession: e.target.value })} placeholder="Ej. 25 Abr 10:00" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
