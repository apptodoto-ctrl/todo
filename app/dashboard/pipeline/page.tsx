"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Plus, GripVertical, MoreVertical, Clock, AlertTriangle, Trash2, Pencil, X, Settings2 } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface Column {
  key: string;
  label: string;
  color: string;
  accent: string;
}

interface Case {
  id: number;
  patient: string;
  age: number;
  diagnosis: string;
  therapist: string;
  days: number;
  overdue: boolean;
  initials: string;
}

const PALETTE = [
  { color: "bg-violet-50 border-violet-200", accent: "bg-violet-500" },
  { color: "bg-blue-50 border-blue-200", accent: "bg-blue-500" },
  { color: "bg-indigo-50 border-indigo-200", accent: "bg-indigo-500" },
  { color: "bg-amber-50 border-amber-200", accent: "bg-amber-500" },
  { color: "bg-orange-50 border-orange-200", accent: "bg-orange-500" },
  { color: "bg-emerald-50 border-emerald-200", accent: "bg-emerald-500" },
  { color: "bg-pink-50 border-pink-200", accent: "bg-pink-500" },
  { color: "bg-cyan-50 border-cyan-200", accent: "bg-cyan-500" },
  { color: "bg-slate-50 border-slate-200", accent: "bg-slate-500" },
];

const defaultColumns: Column[] = [
  { key: "compromiso", label: "Compromiso Familiar", color: "bg-violet-50 border-violet-200", accent: "bg-violet-500" },
  { key: "evaluacion", label: "Evaluación", color: "bg-blue-50 border-blue-200", accent: "bg-blue-500" },
  { key: "factores", label: "Tabla de factores", color: "bg-indigo-50 border-indigo-200", accent: "bg-indigo-500" },
  { key: "priorizacion", label: "Priorización de objetivos", color: "bg-amber-50 border-amber-200", accent: "bg-amber-500" },
  { key: "plan", label: "Creación del plan de acción", color: "bg-orange-50 border-orange-200", accent: "bg-orange-500" },
  { key: "intervencion", label: "En proceso de intervención", color: "bg-emerald-50 border-emerald-200", accent: "bg-emerald-500" },
  { key: "alta", label: "Alta", color: "bg-slate-50 border-slate-200", accent: "bg-slate-500" },
];

const defaultCases: Record<string, Case[]> = {
  compromiso: [{ id: 1, patient: "María González", age: 8, diagnosis: "TEA", therapist: "JP", days: 12, overdue: false, initials: "MG" }],
  evaluacion: [],
  factores: [],
  priorizacion: [
    { id: 2, patient: "Carlos Morales", age: 45, diagnosis: "ACV", therapist: "JP", days: 35, overdue: true, initials: "CM" },
    { id: 3, patient: "Sofía Reyes", age: 6, diagnosis: "Motor", therapist: "JP", days: 28, overdue: true, initials: "SR" },
  ],
  plan: [],
  intervencion: [],
  alta: [],
};

export default function PipelinePage() {
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [cases, setCases] = useState<Record<string, Case[]>>(defaultCases);

  // Add case modal
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  const [newCase, setNewCase] = useState({ patient: "", age: 0, diagnosis: "", days: 0 });

  // Add/edit column modal
  const [showColModal, setShowColModal] = useState(false);
  const [editingCol, setEditingCol] = useState<Column | null>(null);
  const [newColName, setNewColName] = useState("");
  const [newColPalette, setNewColPalette] = useState(0);

  // Delete column confirm
  const [confirmDeleteCol, setConfirmDeleteCol] = useState<string | null>(null);

  // ── Case actions ──────────────────────────────────────────
  const openAddCase = (key: string) => {
    setActiveColumn(key);
    setNewCase({ patient: "", age: 0, diagnosis: "", days: 0 });
    setShowCaseModal(true);
  };

  const addCase = () => {
    if (!newCase.patient.trim() || !activeColumn) return;
    const initials = newCase.patient.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
    const c: Case = { id: Date.now(), ...newCase, therapist: "JP", overdue: false, initials };
    setCases((prev) => ({ ...prev, [activeColumn]: [...(prev[activeColumn] ?? []), c] }));
    setShowCaseModal(false);
  };

  const deleteCase = (colKey: string, caseId: number) => {
    setCases((prev) => ({ ...prev, [colKey]: prev[colKey].filter((c) => c.id !== caseId) }));
  };

  // ── Column actions ────────────────────────────────────────
  const openAddCol = () => {
    setEditingCol(null);
    setNewColName("");
    setNewColPalette(columns.length % PALETTE.length);
    setShowColModal(true);
  };

  const openEditCol = (col: Column) => {
    setEditingCol(col);
    setNewColName(col.label);
    const idx = PALETTE.findIndex((p) => p.accent === col.accent);
    setNewColPalette(idx >= 0 ? idx : 0);
    setShowColModal(true);
  };

  const saveColumn = () => {
    if (!newColName.trim()) return;
    const palette = PALETTE[newColPalette];
    if (editingCol) {
      setColumns((prev) => prev.map((c) => c.key === editingCol.key ? { ...c, label: newColName, ...palette } : c));
    } else {
      const key = `col_${Date.now()}`;
      setColumns((prev) => [...prev, { key, label: newColName, ...palette }]);
      setCases((prev) => ({ ...prev, [key]: [] }));
    }
    setShowColModal(false);
  };

  const deleteColumn = (key: string) => {
    setColumns((prev) => prev.filter((c) => c.key !== key));
    setCases((prev) => { const next = { ...prev }; delete next[key]; return next; });
    setConfirmDeleteCol(null);
  };

  // ── Stats ─────────────────────────────────────────────────
  const allCases = Object.values(cases).flat();
  const totalActive = allCases.length;
  const totalOverdue = allCases.filter((c) => c.overdue).length;

  return (
    <div className="space-y-6 max-w-full">
      {/* Summary + toolbar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          {[
            { label: "Casos activos", value: totalActive, color: "text-violet-600" },
            { label: "Columnas", value: columns.length, color: "text-blue-600" },
            { label: "Vencidos", value: totalOverdue, color: "text-red-600" },
            { label: "Completados", value: cases["alta"]?.length ?? 0, color: "text-emerald-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200/60 p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <button
          onClick={openAddCol}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30 shrink-0"
        >
          <Settings2 className="w-4 h-4" /> Nueva Etapa
        </button>
      </motion.div>

      {/* Kanban board */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          <AnimatePresence>
            {columns.map((col) => {
              const colCases = cases[col.key] ?? [];
              return (
                <motion.div
                  key={col.key}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, width: 0 }}
                  className={`w-64 rounded-2xl border ${col.color} flex flex-col shrink-0`}
                >
                  {/* Column header */}
                  <div className="p-4 border-b border-inherit">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${col.accent}`} />
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-500 bg-white rounded-lg px-2 py-0.5 border border-slate-200">
                          {colCases.length}
                        </span>
                        <button
                          onClick={() => openEditCol(col)}
                          className="p-1 text-slate-300 hover:text-violet-500 rounded-lg transition-colors"
                          title="Editar etapa"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteCol(col.key)}
                          className="p-1 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                          title="Eliminar etapa"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 leading-tight">{col.label}</h3>
                  </div>

                  {/* Cases */}
                  <div className="p-3 flex-1 space-y-2.5 min-h-[200px]">
                    {colCases.map((c) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -1, boxShadow: "0 4px 12px rgba(139,92,246,0.12)" }}
                        className="bg-white rounded-xl border border-slate-200/80 p-3 group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 ${col.accent} rounded-lg flex items-center justify-center text-white text-[10px] font-bold`}>
                              {c.initials}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 leading-tight">{c.patient}</p>
                              <p className="text-[10px] text-slate-400">{c.age} años</p>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteCase(col.key, c.id)}
                            className="p-0.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-2">{c.diagnosis}</p>
                        <div className="flex items-center justify-between">
                          <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${c.overdue ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                            {c.overdue && <AlertTriangle className="w-2.5 h-2.5" />}
                            <Clock className="w-2.5 h-2.5" />
                            {c.days}d
                          </span>
                          <GripVertical className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                      </motion.div>
                    ))}

                    <button
                      onClick={() => openAddCase(col.key)}
                      className="w-full border-2 border-dashed border-slate-200 hover:border-violet-300 text-slate-400 hover:text-violet-500 rounded-xl py-3 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar caso
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Add column shortcut */}
          <button
            onClick={openAddCol}
            className="w-64 shrink-0 rounded-2xl border-2 border-dashed border-slate-200 hover:border-violet-300 text-slate-400 hover:text-violet-500 flex flex-col items-center justify-center gap-2 min-h-[160px] transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs font-medium">Nueva etapa</span>
          </button>
        </div>
      </motion.div>

      {/* Add Case Modal */}
      <Modal
        open={showCaseModal}
        onClose={() => setShowCaseModal(false)}
        title="Agregar Caso"
        subtitle={activeColumn ? columns.find((c) => c.key === activeColumn)?.label : undefined}
        footer={
          <button onClick={addCase} disabled={!newCase.patient.trim()} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30">
            Agregar Caso
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nombre del paciente *</label>
            <input autoFocus type="text" value={newCase.patient} onChange={(e) => setNewCase({ ...newCase, patient: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addCase()} placeholder="Nombre completo" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Edad</label>
              <input type="number" min={0} value={newCase.age || ""} onChange={(e) => setNewCase({ ...newCase, age: parseInt(e.target.value) || 0 })} placeholder="Años" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Días en etapa</label>
              <input type="number" min={0} value={newCase.days || ""} onChange={(e) => setNewCase({ ...newCase, days: parseInt(e.target.value) || 0 })} placeholder="0" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Diagnóstico</label>
            <input type="text" value={newCase.diagnosis} onChange={(e) => setNewCase({ ...newCase, diagnosis: e.target.value })} placeholder="Diagnóstico principal" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
        </div>
      </Modal>

      {/* Add/Edit Column Modal */}
      <Modal
        open={showColModal}
        onClose={() => setShowColModal(false)}
        title={editingCol ? "Editar Etapa" : "Nueva Etapa"}
        footer={
          <button onClick={saveColumn} disabled={!newColName.trim()} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30">
            {editingCol ? "Guardar cambios" : "Crear Etapa"}
          </button>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nombre de la etapa *</label>
            <input
              autoFocus
              type="text"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveColumn()}
              placeholder="Ej. Seguimiento, Cierre, etc."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setNewColPalette(i)}
                  className={`w-8 h-8 rounded-lg ${p.accent} transition-all ${newColPalette === i ? "ring-2 ring-offset-2 ring-violet-500 scale-110" : "opacity-60 hover:opacity-100"}`}
                />
              ))}
            </div>
          </div>
          {newColName && (
            <div className={`rounded-xl border p-3 ${PALETTE[newColPalette].color}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${PALETTE[newColPalette].accent}`} />
                <span className="text-sm font-bold text-slate-700">{newColName}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Column Confirm Modal */}
      <Modal
        open={!!confirmDeleteCol}
        onClose={() => setConfirmDeleteCol(null)}
        title="Eliminar Etapa"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setConfirmDeleteCol(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
              Cancelar
            </button>
            <button onClick={() => confirmDeleteCol && deleteColumn(confirmDeleteCol)} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all">
              Eliminar
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          ¿Eliminar la etapa <strong>&quot;{columns.find((c) => c.key === confirmDeleteCol)?.label}&quot;</strong>?
          {(cases[confirmDeleteCol ?? ""]?.length ?? 0) > 0 && (
            <span className="block mt-2 text-amber-600 font-medium">
              ⚠️ Tiene {cases[confirmDeleteCol ?? ""]?.length} caso(s) que también serán eliminados.
            </span>
          )}
        </p>
      </Modal>
    </div>
  );
}
