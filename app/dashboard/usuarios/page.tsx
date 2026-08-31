"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Plus, Search, Phone, Mail, MoreVertical, Calendar, ClipboardList, User, Activity, Hash, Pencil, Trash2, NotebookPen, Loader2, Target, Download, DollarSign } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useCurrentUser } from "@/lib/useCurrentUser";

interface Patient {
  id: number;
  name: string;
  age: number;
  birthDate: string;
  guardian: string;
  guardianPhone: string;
  prevision: string;
  school: string;
  consultReason: string;
  sessionValue: number;
  diagnosis: string;
  therapist: string;
  sessions: number;
  nextSession: string;
  status: string;
  initials: string;
  color: string;
  phone: string;
  email: string;
  rut: string;
}

interface SessionRecord {
  id: number;
  patientId: number;
  date: string;
  notes: string;
  therapist: string;
  duration: number;
  attended: boolean;
  paid: boolean;
}

interface Objective {
  id: number;
  patientId: number;
  title: string;
  status: string;
  progress: number;
}

// Edad calculada desde la fecha de nacimiento; si no hay, usa el campo age
function displayAge(p: { birthDate?: string; age: number }): number {
  if (p.birthDate) {
    const b = new Date(p.birthDate + "T00:00:00");
    if (!isNaN(b.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - b.getFullYear();
      const m = today.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
      return Math.max(0, age);
    }
  }
  return p.age;
}

function formatRut(value: string): string {
  // Solo aplicar formato de RUT chileno cuando el valor parece un RUT
  // (dígitos, puntos, guión y dígito verificador K). Pasaportes u otros
  // documentos con letras se dejan tal cual.
  if (!/^[0-9.\-kK]*$/.test(value)) return value.toUpperCase();
  const clean = value.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length === 0) return "";
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return formatted ? `${formatted}-${dv}` : dv;
}

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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", age: 0, birthDate: "", guardian: "", guardianPhone: "", prevision: "", consultReason: "", sessionValue: 0, diagnosis: "", status: "activo", nextSession: "", phone: "", email: "", rut: "" });
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState<Partial<Patient>>({});
  const [sessionRecords, setSessionRecords] = useState<SessionRecord[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSession, setNewSession] = useState({ date: "", notes: "", duration: 45, attended: true, paid: false });
  const [savingSession, setSavingSession] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionRecord | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [newObjective, setNewObjective] = useState("");
  const [savingObjective, setSavingObjective] = useState(false);
  const { email: currentUserEmail, name: currentUserName } = useCurrentUser();

  useEffect(() => {
    const close = () => setMenuOpenId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    if (!currentUserEmail) return;
    fetch(`/api/patients?createdBy=${encodeURIComponent(currentUserEmail)}`)
      .then((r) => r.json())
      .then((data) => { setPatients(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentUserEmail]);

  useEffect(() => {
    if (!selectedPatient) { setSessionRecords([]); setObjectives([]); setShowAddSession(false); setEditingSession(null); return; }
    setSessionsLoading(true);
    fetch(`/api/patients/${selectedPatient.id}/sessions`)
      .then((r) => r.json())
      .then((data) => { setSessionRecords(Array.isArray(data) ? data : []); setSessionsLoading(false); })
      .catch(() => setSessionsLoading(false));
    fetch(`/api/patients/${selectedPatient.id}/objectives`)
      .then((r) => r.json())
      .then((data) => setObjectives(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [selectedPatient?.id]);

  const addSession = async () => {
    if (!selectedPatient || !newSession.date) return;
    setSavingSession(true);
    const res = await fetch(`/api/patients/${selectedPatient.id}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newSession, therapist: currentUserName, createdBy: currentUserEmail }),
    });
    if (res.ok) {
      const record = await res.json();
      setSessionRecords((prev) => [record, ...prev].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id));
      setPatients((prev) => prev.map((p) => (p.id === selectedPatient.id ? { ...p, sessions: record.sessions } : p)));
      setSelectedPatient((prev) => (prev ? { ...prev, sessions: record.sessions } : prev));
      setNewSession({ date: "", notes: "", duration: 45, attended: true, paid: false });
      setShowAddSession(false);
    }
    setSavingSession(false);
  };

  const saveEditSession = async () => {
    if (!selectedPatient || !editingSession) return;
    const res = await fetch(`/api/patients/${selectedPatient.id}/sessions/${editingSession.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: editingSession.date,
        notes: editingSession.notes,
        duration: editingSession.duration,
        attended: editingSession.attended,
        paid: editingSession.paid,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSessionRecords((prev) => prev.map((s) => (s.id === updated.id ? updated : s)).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id));
      setEditingSession(null);
    }
  };

  const toggleSessionPaid = async (s: SessionRecord) => {
    if (!selectedPatient) return;
    setSessionRecords((prev) => prev.map((x) => (x.id === s.id ? { ...x, paid: !s.paid } : x)));
    const res = await fetch(`/api/patients/${selectedPatient.id}/sessions/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !s.paid }),
    });
    if (!res.ok) setSessionRecords((prev) => prev.map((x) => (x.id === s.id ? { ...x, paid: s.paid } : x)));
  };

  const addObjective = async () => {
    if (!selectedPatient || !newObjective.trim()) return;
    setSavingObjective(true);
    const res = await fetch(`/api/patients/${selectedPatient.id}/objectives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newObjective }),
    });
    if (res.ok) {
      const obj = await res.json();
      setObjectives((prev) => [...prev, obj]);
      setNewObjective("");
    }
    setSavingObjective(false);
  };

  const updateObjective = async (obj: Objective, changes: Partial<Objective>) => {
    if (!selectedPatient) return;
    setObjectives((prev) => prev.map((o) => (o.id === obj.id ? { ...o, ...changes } : o)));
    const res = await fetch(`/api/patients/${selectedPatient.id}/objectives/${obj.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    if (!res.ok) setObjectives((prev) => prev.map((o) => (o.id === obj.id ? obj : o)));
  };

  const deleteObjective = async (id: number) => {
    if (!selectedPatient || !confirm("¿Eliminar este objetivo?")) return;
    const res = await fetch(`/api/patients/${selectedPatient.id}/objectives/${id}`, { method: "DELETE" });
    if (res.ok) setObjectives((prev) => prev.filter((o) => o.id !== id));
  };

  const exportCSV = () => {
    const headers = ["Nombre", "Edad", "Fecha nacimiento", "Documento", "Diagnóstico", "Estado", "Tutor", "Teléfono tutor", "Previsión", "Teléfono", "Email", "Sesiones", "Próxima sesión"];
    const rows = patients.map((p) => [
      p.name, displayAge(p), p.birthDate, p.rut, p.diagnosis, statusConfig[p.status]?.label ?? p.status,
      p.guardian, p.guardianPhone, p.prevision, p.phone, p.email, p.sessions, p.nextSession,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pacientes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteSession = async (sessionId: number) => {
    if (!selectedPatient || !confirm("¿Eliminar esta sesión del historial?")) return;
    const res = await fetch(`/api/patients/${selectedPatient.id}/sessions/${sessionId}`, { method: "DELETE" });
    if (res.ok) {
      const { sessions } = await res.json();
      setSessionRecords((prev) => prev.filter((s) => s.id !== sessionId));
      setPatients((prev) => prev.map((p) => (p.id === selectedPatient.id ? { ...p, sessions } : p)));
      setSelectedPatient((prev) => (prev ? { ...prev, sessions } : prev));
    }
  };

  const addPatient = async () => {
    if (!newPatient.name.trim() || !newPatient.diagnosis.trim()) return;
    const initials = newPatient.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
    const colors = ["from-violet-500 to-purple-600", "from-blue-500 to-indigo-600", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-500", "from-pink-500 to-rose-500"];
    const color = colors[patients.length % colors.length];
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newPatient, age: newPatient.birthDate ? displayAge(newPatient) : newPatient.age, sessionValue: Number(newPatient.sessionValue) || 0, therapist: currentUserName, sessions: 0, initials, color, createdBy: currentUserEmail }),
    });
    if (res.ok) {
      const patient = await res.json();
      setPatients((prev) => [...prev, patient]);
      setNewPatient({ name: "", age: 0, birthDate: "", guardian: "", guardianPhone: "", prevision: "", consultReason: "", sessionValue: 0, diagnosis: "", status: "activo", nextSession: "", phone: "", email: "", rut: "" });
      setShowNewPatient(false);
      setFilter("todos");
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error || "No se pudo crear el usuario");
      if (data?.code === "patient_limit" || data?.code === "subscription_expired") {
        window.location.href = "/dashboard/plan";
      }
    }
  };

  const deletePatient = async (id: number) => {
    if (!confirm("¿Eliminar este usuario?")) return;
    const res = await fetch(`/api/patients/${id}`, { method: "DELETE" });
    if (res.ok) setPatients((prev) => prev.filter((p) => p.id !== id));
  };

  const openEdit = (p: Patient) => {
    setEditForm({ name: p.name, age: p.age, birthDate: p.birthDate, guardian: p.guardian, guardianPhone: p.guardianPhone, prevision: p.prevision, consultReason: p.consultReason, sessionValue: p.sessionValue, diagnosis: p.diagnosis, status: p.status, nextSession: p.nextSession, phone: p.phone, email: p.email, rut: p.rut });
    setEditPatient(p);
    setMenuOpenId(null);
  };

  const saveEdit = async () => {
    if (!editPatient) return;
    const res = await fetch(`/api/patients/${editPatient.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, age: editForm.birthDate ? displayAge(editForm as Patient) : editForm.age, sessionValue: Number(editForm.sessionValue) || 0 }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSelectedPatient((prev) => (prev && prev.id === updated.id ? updated : prev));
      setEditPatient(null);
    }
  };

  const filtered = patients.filter((p: Patient) => {
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
          <p className="text-slate-500 text-sm">{patients.length} usuarios registrados</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button onClick={exportCSV} disabled={patients.length === 0} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-medium text-sm hover:border-violet-300 hover:text-violet-700 disabled:opacity-50 transition-all">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button onClick={() => setShowNewPatient(true)} className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30">
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>
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
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
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
          { label: "Usuarios activos", value: patients.filter(p => p.status === "activo").length, color: "text-emerald-600" },
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
                  <div
                    className={`w-11 h-11 ${p.color.startsWith('#') ? '' : `bg-gradient-to-br ${p.color}`} rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md`}
                    style={p.color.startsWith('#') ? { background: p.color } : {}}
                  >
                    {p.initials}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{p.name}</h3>
                    <p className="text-xs text-slate-400">{displayAge(p)} años</p>
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${statusConfig[p.status]?.cls}`}>
                    {statusConfig[p.status]?.label}
                  </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                  <span>{p.diagnosis}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Próxima: {p.nextSession}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-600">{p.sessions}</span> sesiones
                </div>
                <div className="flex gap-1.5">
                  <a
                    href={p.email ? `mailto:${p.email}` : undefined}
                    onClick={!p.email ? (e) => e.preventDefault() : undefined}
                    title={p.email || "Sin email"}
                    className={`p-1.5 rounded-lg transition-all ${p.email ? "text-slate-400 hover:text-violet-600 hover:bg-violet-50 cursor-pointer" : "text-slate-200 cursor-not-allowed"}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={p.phone ? `tel:${p.phone}` : undefined}
                    onClick={!p.phone ? (e) => e.preventDefault() : undefined}
                    title={p.phone || "Sin teléfono"}
                    className={`p-1.5 rounded-lg transition-all ${p.phone ? "text-slate-400 hover:text-violet-600 hover:bg-violet-50 cursor-pointer" : "text-slate-200 cursor-not-allowed"}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => setSelectedPatient(p)} className="px-3 py-1.5 text-xs font-medium text-violet-600 hover:text-white hover:bg-gradient-to-r hover:from-violet-500 hover:to-purple-600 border border-violet-200 hover:border-transparent rounded-lg transition-all">
                    Ver perfil
                  </button>
                  <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all" title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deletePatient(p.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Edit Modal */}
      <Modal
        open={!!editPatient}
        onClose={() => setEditPatient(null)}
        title="Editar Usuario"
        footer={
          <button onClick={saveEdit} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30">
            Guardar cambios
          </button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nombre</label>
              <input type="text" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Fecha de nacimiento</label>
              <input type="date" value={editForm.birthDate || ""} onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
              <p className="text-[11px] text-slate-400 mt-1">{editForm.birthDate ? `Edad: ${displayAge(editForm as Patient)} años` : "Si no la sabes, deja vacío"}</p>
            </div>
          </div>
          {!editForm.birthDate && (
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Edad</label>
              <input type="number" min={0} max={120} value={editForm.age || ""} onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
          )}
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">RUT / Documento</label>
            <input type="text" value={editForm.rut || ""} onChange={(e) => setEditForm({ ...editForm, rut: formatRut(e.target.value) })} placeholder="12.345.678-9 o pasaporte/DNI" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Diagnóstico</label>
            <input type="text" value={editForm.diagnosis || ""} onChange={(e) => setEditForm({ ...editForm, diagnosis: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Motivo de consulta</label>
            <textarea rows={2} value={editForm.consultReason || ""} onChange={(e) => setEditForm({ ...editForm, consultReason: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tutor / Apoderado</label>
              <input type="text" value={editForm.guardian || ""} onChange={(e) => setEditForm({ ...editForm, guardian: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Teléfono tutor</label>
              <input type="tel" value={editForm.guardianPhone || ""} onChange={(e) => setEditForm({ ...editForm, guardianPhone: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Previsión</label>
              <select value={editForm.prevision || ""} onChange={(e) => setEditForm({ ...editForm, prevision: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white">
                <option value="">Sin especificar</option>
                <option value="Fonasa">Fonasa</option>
                <option value="Isapre">Isapre</option>
                <option value="Particular">Particular</option>
                <option value="Otra">Otra</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Valor sesión (CLP)</label>
              <input type="number" min={0} value={editForm.sessionValue || ""} onChange={(e) => setEditForm({ ...editForm, sessionValue: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Estado</label>
            <select value={editForm.status || "activo"} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white">
              <option value="activo">Activo</option>
              <option value="evaluacion">En Evaluación</option>
              <option value="alta">Alta</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Próxima sesión</label>
            <input type="date" value={editForm.nextSession || ""} onChange={(e) => setEditForm({ ...editForm, nextSession: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Teléfono</label>
              <input type="tel" value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Email</label>
              <input type="email" value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
          </div>
        </div>
      </Modal>

      {/* Profile Modal */}
      <Modal
        open={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        title="Perfil del Usuario"
        maxWidth="max-w-lg"
      >
        {selectedPatient && (
          <div className="space-y-5">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 ${selectedPatient.color.startsWith('#') ? '' : `bg-gradient-to-br ${selectedPatient.color}`} rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg`}
                style={selectedPatient.color.startsWith('#') ? { background: selectedPatient.color } : {}}
              >
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
                { icon: User, label: "Edad", value: `${displayAge(selectedPatient)} años${selectedPatient.birthDate ? ` (${selectedPatient.birthDate.split("-").reverse().join("-")})` : ""}` },
                { icon: Activity, label: "Terapeuta", value: selectedPatient.therapist },
                { icon: ClipboardList, label: "Diagnóstico", value: selectedPatient.diagnosis },
                { icon: Hash, label: "Sesiones", value: `${selectedPatient.sessions} realizadas` },
                { icon: Calendar, label: "Próxima sesión", value: selectedPatient.nextSession || "—" },
                ...(selectedPatient.guardian ? [{ icon: User, label: "Tutor / Apoderado", value: `${selectedPatient.guardian}${selectedPatient.guardianPhone ? ` · ${selectedPatient.guardianPhone}` : ""}` }] : []),
                ...(selectedPatient.prevision ? [{ icon: ClipboardList, label: "Previsión", value: selectedPatient.prevision }] : []),
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

            {selectedPatient.consultReason && (
              <div className="bg-slate-50 rounded-xl p-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Motivo de consulta</span>
                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{selectedPatient.consultReason}</p>
              </div>
            )}

            {/* Adherencia y pagos */}
            {sessionRecords.length > 0 && (() => {
              const asistidas = sessionRecords.filter((s) => s.attended).length;
              const adherencia = Math.round((asistidas / sessionRecords.length) * 100);
              const pendientesPago = sessionRecords.filter((s) => s.attended && !s.paid).length;
              const valor = selectedPatient.sessionValue || 0;
              return (
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-xl p-3 ${adherencia >= 80 ? "bg-emerald-50" : adherencia >= 50 ? "bg-amber-50" : "bg-rose-50"}`}>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Adherencia</span>
                    <p className={`text-lg font-bold ${adherencia >= 80 ? "text-emerald-600" : adherencia >= 50 ? "text-amber-600" : "text-rose-600"}`}>{adherencia}%</p>
                    <p className="text-[11px] text-slate-400">{asistidas} de {sessionRecords.length} sesiones</p>
                  </div>
                  <div className={`rounded-xl p-3 ${pendientesPago === 0 ? "bg-emerald-50" : "bg-amber-50"}`}>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Pagos</span>
                    <p className={`text-lg font-bold ${pendientesPago === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {pendientesPago === 0 ? "Al día" : `${pendientesPago} pendiente${pendientesPago > 1 ? "s" : ""}`}
                    </p>
                    {valor > 0 && pendientesPago > 0 && <p className="text-[11px] text-slate-400">${(pendientesPago * valor).toLocaleString("es-CL")} por cobrar</p>}
                  </div>
                </div>
              );
            })()}

            {/* Objetivos terapéuticos */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-violet-500" />
                <h4 className="text-sm font-bold text-slate-700">Objetivos terapéuticos</h4>
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addObjective(); }}
                  placeholder="Nuevo objetivo (ej. Tolerar 3 texturas nuevas)..."
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
                <button onClick={addObjective} disabled={savingObjective || !newObjective.trim()} className="px-3 bg-violet-50 hover:bg-violet-100 text-violet-600 rounded-lg disabled:opacity-50 transition-all">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {objectives.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5 text-center">Sin objetivos definidos aún</p>
              ) : (
                <div className="space-y-2">
                  {objectives.map((obj) => (
                    <div key={obj.id} className="bg-slate-50 rounded-xl p-3 group">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className={`text-xs font-semibold ${obj.status === "logrado" ? "text-emerald-600 line-through" : "text-slate-700"}`}>{obj.title}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          {obj.status !== "logrado" ? (
                            <button onClick={() => updateObjective(obj, { status: "logrado", progress: 100 })} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">✓ Logrado</button>
                          ) : (
                            <button onClick={() => updateObjective(obj, { status: "activo", progress: obj.progress === 100 ? 75 : obj.progress })} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">Reabrir</button>
                          )}
                          <button onClick={() => deleteObjective(obj.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={obj.progress}
                          onChange={(e) => updateObjective(obj, { progress: Number(e.target.value), ...(Number(e.target.value) === 100 ? { status: "logrado" } : { status: "activo" }) })}
                          className="flex-1 accent-violet-500 h-1.5"
                        />
                        <span className="text-[11px] font-bold text-slate-500 w-9 text-right">{obj.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historial de sesiones */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <NotebookPen className="w-4 h-4 text-violet-500" />
                  <h4 className="text-sm font-bold text-slate-700">Historial de sesiones</h4>
                </div>
                <button
                  onClick={() => { setShowAddSession(!showAddSession); setNewSession({ date: new Date().toISOString().slice(0, 10), notes: "", duration: 45, attended: true, paid: false }); }}
                  className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-2.5 py-1.5 rounded-lg transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Registrar sesión
                </button>
              </div>

              {showAddSession && (
                <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-3 mb-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Fecha (puede ser pasada)</label>
                      <input type="date" value={newSession.date} onChange={(e) => setNewSession({ ...newSession, date: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Duración</label>
                      <select value={newSession.duration} onChange={(e) => setNewSession({ ...newSession, duration: Number(e.target.value) })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all">
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>60 min</option>
                        <option value={90}>90 min</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Notas de evolución</label>
                    <textarea value={newSession.notes} onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })} rows={3} placeholder="Qué se trabajó, avances, observaciones..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all resize-none" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={newSession.attended} onChange={(e) => setNewSession({ ...newSession, attended: e.target.checked })} className="accent-violet-500" /> Asistió
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={newSession.paid} onChange={(e) => setNewSession({ ...newSession, paid: e.target.checked })} className="accent-emerald-500" /> Pagada
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addSession} disabled={savingSession || !newSession.date} className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold py-2 rounded-lg hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 transition-all">
                      {savingSession ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Guardar
                    </button>
                    <button onClick={() => setShowAddSession(false)} className="px-4 text-sm font-medium text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg transition-all">Cancelar</button>
                  </div>
                </div>
              )}

              {sessionsLoading ? (
                <div className="flex items-center justify-center py-4 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /></div>
              ) : sessionRecords.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-3 text-center">Sin sesiones registradas aún. Registra sesiones pasadas o nuevas para construir el historial clínico.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {sessionRecords.map((s) => (
                    editingSession?.id === s.id ? (
                      <div key={s.id} className="bg-violet-50/60 border border-violet-100 rounded-xl p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" value={editingSession.date} onChange={(e) => setEditingSession({ ...editingSession, date: e.target.value })} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                          <select value={editingSession.duration} onChange={(e) => setEditingSession({ ...editingSession, duration: Number(e.target.value) })} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30">
                            <option value={30}>30 min</option>
                            <option value={45}>45 min</option>
                            <option value={60}>60 min</option>
                            <option value={90}>90 min</option>
                          </select>
                        </div>
                        <textarea value={editingSession.notes} onChange={(e) => setEditingSession({ ...editingSession, notes: e.target.value })} rows={3} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none" />
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={editingSession.attended} onChange={(e) => setEditingSession({ ...editingSession, attended: e.target.checked })} className="accent-violet-500" /> Asistió
                          </label>
                          <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={editingSession.paid} onChange={(e) => setEditingSession({ ...editingSession, paid: e.target.checked })} className="accent-emerald-500" /> Pagada
                          </label>
                          <div className="flex-1" />
                          <button onClick={saveEditSession} className="text-[11px] font-semibold px-2 py-1 rounded-md bg-violet-500 text-white hover:bg-violet-600 transition-colors">Guardar</button>
                          <button onClick={() => setEditingSession(null)} className="text-[11px] font-medium px-2 py-1 rounded-md text-slate-500 bg-white border border-slate-200 hover:text-slate-700 transition-colors">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                    <div key={s.id} className="bg-slate-50 rounded-xl p-3 group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <Calendar className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-600">{s.date.split("-").reverse().join("-")}</span>
                          <span className="text-[11px] text-slate-400">· {s.duration} min</span>
                          {!s.attended && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-600">No asistió</span>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {s.attended && (
                            <button onClick={() => toggleSessionPaid(s)} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md transition-colors flex items-center gap-0.5 ${s.paid ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600 hover:bg-amber-200"}`} title={s.paid ? "Marcar como no pagada" : "Marcar como pagada"}>
                              <DollarSign className="w-2.5 h-2.5" /> {s.paid ? "Pagada" : "Pendiente"}
                            </button>
                          )}
                          <button onClick={() => setEditingSession(s)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-violet-500 transition-all" title="Editar sesión">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteSession(s.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {s.notes && <p className="text-xs text-slate-600 whitespace-pre-wrap">{s.notes}</p>}
                    </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <a
                href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(selectedPatient.email || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  selectedPatient.email
                    ? 'border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300'
                    : 'border-slate-200 text-slate-400 cursor-not-allowed opacity-50 pointer-events-none'
                }`}
              >
                <Mail className="w-4 h-4" /> Gmail
              </a>
              <a
                href={`https://wa.me/${(selectedPatient.phone || '').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  selectedPatient.phone
                    ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'
                    : 'border-slate-200 text-slate-400 cursor-not-allowed opacity-50 pointer-events-none'
                }`}
              >
                <Phone className="w-4 h-4" /> WhatsApp
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* New Patient Modal */}
      <Modal
        open={showNewPatient}
        onClose={() => setShowNewPatient(false)}
        title="Nuevo Usuario"
        footer={
          <button onClick={addPatient} disabled={!newPatient.name.trim() || !newPatient.diagnosis.trim()} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30">
            Registrar Usuario
          </button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nombre *</label>
              <input autoFocus type="text" value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} placeholder="Nombre completo" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Fecha de nacimiento</label>
              <input type="date" value={newPatient.birthDate} onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
              <p className="text-[11px] text-slate-400 mt-1">La edad se calcula sola{newPatient.birthDate ? `: ${displayAge(newPatient)} años` : ""}</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">RUT / Documento</label>
            <input type="text" value={newPatient.rut} onChange={(e) => setNewPatient({ ...newPatient, rut: formatRut(e.target.value) })} placeholder="12.345.678-9 o pasaporte/DNI" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Diagnóstico *</label>
            <input type="text" value={newPatient.diagnosis} onChange={(e) => setNewPatient({ ...newPatient, diagnosis: e.target.value })} placeholder="Diagnóstico principal" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Motivo de consulta</label>
            <textarea rows={2} value={newPatient.consultReason} onChange={(e) => setNewPatient({ ...newPatient, consultReason: e.target.value })} placeholder="Por qué consulta, quién deriva..." className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tutor / Apoderado</label>
              <input type="text" value={newPatient.guardian} onChange={(e) => setNewPatient({ ...newPatient, guardian: e.target.value })} placeholder="Nombre (si aplica)" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Teléfono tutor</label>
              <input type="tel" value={newPatient.guardianPhone} onChange={(e) => setNewPatient({ ...newPatient, guardianPhone: e.target.value })} placeholder="+56912345678" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Previsión</label>
              <select value={newPatient.prevision} onChange={(e) => setNewPatient({ ...newPatient, prevision: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white">
                <option value="">Sin especificar</option>
                <option value="Fonasa">Fonasa</option>
                <option value="Isapre">Isapre</option>
                <option value="Particular">Particular</option>
                <option value="Otra">Otra</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Valor sesión (CLP)</label>
              <input type="number" min={0} value={newPatient.sessionValue || ""} onChange={(e) => setNewPatient({ ...newPatient, sessionValue: parseInt(e.target.value) || 0 })} placeholder="Ej. 35000" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Estado</label>
            <select value={newPatient.status} onChange={(e) => setNewPatient({ ...newPatient, status: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white">
              <option value="activo">Activo</option>
              <option value="evaluacion">En Evaluación</option>
              <option value="alta">Alta</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Próxima sesión</label>
            <input type="date" value={newPatient.nextSession} onChange={(e) => setNewPatient({ ...newPatient, nextSession: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Teléfono / WhatsApp</label>
              <input type="tel" value={newPatient.phone} onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })} placeholder="+56912345678" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Email</label>
              <input type="email" value={newPatient.email} onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })} placeholder="correo@email.com" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
