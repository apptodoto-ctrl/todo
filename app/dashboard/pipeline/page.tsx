"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Plus, GripVertical, MoreVertical, User, Clock, AlertTriangle, X } from "lucide-react";

type CaseStatus = "compromiso" | "evaluacion" | "factores" | "priorizacion" | "plan" | "intervencion" | "alta";

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

const columns: { key: CaseStatus; label: string; color: string; accent: string }[] = [
  { key: "compromiso", label: "Compromiso Familiar", color: "bg-violet-50 border-violet-200", accent: "bg-violet-500" },
  { key: "evaluacion", label: "Evaluación", color: "bg-blue-50 border-blue-200", accent: "bg-blue-500" },
  { key: "factores", label: "Tabla de factores", color: "bg-indigo-50 border-indigo-200", accent: "bg-indigo-500" },
  { key: "priorizacion", label: "Priorización de objetivos", color: "bg-amber-50 border-amber-200", accent: "bg-amber-500" },
  { key: "plan", label: "Creación del plan de acción", color: "bg-orange-50 border-orange-200", accent: "bg-orange-500" },
  { key: "intervencion", label: "En proceso de intervención", color: "bg-emerald-50 border-emerald-200", accent: "bg-emerald-500" },
  { key: "alta", label: "Alta", color: "bg-slate-50 border-slate-200", accent: "bg-slate-500" },
];

const initialCases: Record<CaseStatus, Case[]> = {
  compromiso: [
    { id: 1, patient: "María González", age: 8, diagnosis: "TEA", therapist: "JP", days: 12, overdue: false, initials: "MG" },
  ],
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
  const [cases, setCases] = useState(initialCases);
  const [showModal, setShowModal] = useState(false);
  const [activeColumn, setActiveColumn] = useState<CaseStatus | null>(null);
  const [newCase, setNewCase] = useState({ patient: "", age: 0, diagnosis: "", days: 0 });

  const openAddCase = (col: CaseStatus) => {
    setActiveColumn(col);
    setNewCase({ patient: "", age: 0, diagnosis: "", days: 0 });
    setShowModal(true);
  };

  const addCase = () => {
    if (!newCase.patient.trim() || !activeColumn) return;
    const initials = newCase.patient.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
    const c: Case = { id: Date.now(), ...newCase, therapist: "JP", overdue: false, initials };
    setCases((prev) => ({ ...prev, [activeColumn]: [...prev[activeColumn], c] }));
    setShowModal(false);
  };

  const totalActive = Object.values(cases).flat().length;
  const totalOverdue = Object.values(cases).flat().filter(c => c.overdue).length;

  return (
    <div className="space-y-6 max-w-full">
      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {[
          { label: "Casos activos", value: totalActive, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "En intervención", value: cases.intervencion.length, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "En evaluación", value: cases.evaluacion.length, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Casos vencidos", value: totalOverdue, color: "text-red-600", bg: "bg-red-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200/60 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Kanban board */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="overflow-x-auto pb-4"
      >
        <div className="flex gap-4 min-w-max">
          {columns.map((col) => {
            const colCases = cases[col.key];
            return (
              <div
                key={col.key}
                className={`w-64 rounded-2xl border ${col.color} flex flex-col`}
              >
                {/* Column header */}
                <div className="p-4 border-b border-inherit">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${col.accent}`} />
                    <span className="text-xs font-bold text-slate-500 bg-white rounded-lg px-2 py-0.5 border border-slate-200">
                      {colCases.length} caso{colCases.length !== 1 ? "s" : ""}
                    </span>
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
                      className="bg-white rounded-xl border border-slate-200/80 p-3 cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
                            {c.initials}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 leading-tight">{c.patient}</p>
                            <p className="text-[10px] text-slate-400">{c.age} años</p>
                          </div>
                        </div>
                        <button className="p-0.5 text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">{c.diagnosis}</p>
                      <div className="flex items-center justify-between">
                        <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                          c.overdue
                            ? "bg-red-50 text-red-600"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {c.overdue && <AlertTriangle className="w-2.5 h-2.5" />}
                          <Clock className="w-2.5 h-2.5" />
                          {c.days}d
                        </span>
                        <GripVertical className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    </motion.div>
                  ))}

                  {/* Add button */}
                  <button onClick={() => openAddCase(col.key)} className="w-full border-2 border-dashed border-slate-200 hover:border-violet-300 text-slate-400 hover:text-violet-500 rounded-xl py-3 text-xs font-medium flex items-center justify-center gap-1.5 transition-all">
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Add Case Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-800">Agregar Caso</h3>
                  {activeColumn && <p className="text-xs text-slate-400 mt-0.5">{columns.find(c => c.key === activeColumn)?.label}</p>}
                </div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 hover:bg-slate-100 rounded-xl flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nombre del paciente *</label>
                  <input type="text" value={newCase.patient} onChange={(e) => setNewCase({ ...newCase, patient: e.target.value })} placeholder="Nombre completo" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
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
              <div className="px-6 pb-6">
                <button onClick={addCase} disabled={!newCase.patient.trim()} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30">
                  Agregar Caso
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
