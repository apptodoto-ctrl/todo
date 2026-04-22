"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Plus, GripVertical, Clock, AlertTriangle, Trash2, Pencil, X, Settings2, ChevronDown, FolderKanban } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface Case {
  id: number;
  patient: string;
  age: number;
  diagnosis: string;
  therapist: string;
  days: number;
  overdue: boolean;
  initials: string;
  columnId: string;
}

interface Column {
  id: string;
  label: string;
  color: string;
  accent: string;
  order: number;
  cases: Case[];
}

interface Pipeline {
  id: string;
  name: string;
  columns: Column[];
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

export default function PipelinePage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [newCase, setNewCase] = useState({ patient: "", age: 0, diagnosis: "", days: 0 });
  const [showColModal, setShowColModal] = useState(false);
  const [editingCol, setEditingCol] = useState<Column | null>(null);
  const [newColName, setNewColName] = useState("");
  const [newColPalette, setNewColPalette] = useState(0);
  const [confirmDeleteColId, setConfirmDeleteColId] = useState<string | null>(null);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [confirmDeletePipelineId, setConfirmDeletePipelineId] = useState<string | null>(null);
  const [showPipelineDropdown, setShowPipelineDropdown] = useState(false);
  const dragCaseId = useRef<number | null>(null);
  const dragFromColId = useRef<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pipelines")
      .then((r) => r.json())
      .then((data: Pipeline[]) => {
        setPipelines(data);
        if (data.length > 0) setActivePipelineId(data[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const activePipeline = pipelines.find((p) => p.id === activePipelineId) ?? null;
  const columns = activePipeline?.columns ?? [];

  const onDragStart = (caseId: number, colId: string) => {
    dragCaseId.current = caseId;
    dragFromColId.current = colId;
  };

  const onDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverColId(colId);
  };

  const onDrop = async (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    setDragOverColId(null);
    const caseId = dragCaseId.current;
    const fromColId = dragFromColId.current;
    if (!caseId || !fromColId || fromColId === targetColId) return;
    setPipelines((prev) =>
      prev.map((pip) => ({
        ...pip,
        columns: pip.columns.map((col) => {
          if (col.id === fromColId) return { ...col, cases: col.cases.filter((c) => c.id !== caseId) };
          if (col.id === targetColId) {
            const movedCase = pip.columns.flatMap((c) => c.cases).find((c) => c.id === caseId);
            return movedCase ? { ...col, cases: [...col.cases, { ...movedCase, columnId: targetColId }] } : col;
          }
          return col;
        }),
      }))
    );
    await fetch(`/api/pipeline/cases/${caseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId: targetColId }),
    });
  };

  const openAddCase = (id: string) => {
    setActiveColumnId(id);
    setNewCase({ patient: "", age: 0, diagnosis: "", days: 0 });
    setShowCaseModal(true);
  };

  const addCase = async () => {
    if (!newCase.patient.trim() || !activeColumnId) return;
    const initials = newCase.patient.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
    const res = await fetch("/api/pipeline/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newCase, therapist: "JP", overdue: false, initials, columnId: activeColumnId }),
    });
    if (res.ok) {
      const c: Case = await res.json();
      setPipelines((prev) =>
        prev.map((pip) => ({
          ...pip,
          columns: pip.columns.map((col) =>
            col.id === activeColumnId ? { ...col, cases: [...col.cases, c] } : col
          ),
        }))
      );
      setShowCaseModal(false);
    }
  };

  const deleteCase = async (colId: string, caseId: number) => {
    setPipelines((prev) =>
      prev.map((pip) => ({
        ...pip,
        columns: pip.columns.map((col) =>
          col.id === colId ? { ...col, cases: col.cases.filter((c) => c.id !== caseId) } : col
        ),
      }))
    );
    await fetch(`/api/pipeline/cases/${caseId}`, { method: "DELETE" });
  };

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

  const saveColumn = async () => {
    if (!newColName.trim()) return;
    const palette = PALETTE[newColPalette];
    if (editingCol) {
      const res = await fetch(`/api/pipeline/columns/${editingCol.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newColName, color: palette.color, accent: palette.accent }),
      });
      if (res.ok) {
        setPipelines((prev) =>
          prev.map((pip) => ({
            ...pip,
            columns: pip.columns.map((c) =>
              c.id === editingCol.id ? { ...c, label: newColName, ...palette } : c
            ),
          }))
        );
      }
    } else {
      const res = await fetch("/api/pipeline/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newColName, color: palette.color, accent: palette.accent, pipelineId: activePipelineId }),
      });
      if (res.ok) {
        const col: Column = await res.json();
        setPipelines((prev) =>
          prev.map((pip) =>
            pip.id === activePipelineId ? { ...pip, columns: [...pip.columns, col] } : pip
          )
        );
      }
    }
    setShowColModal(false);
  };

  const deleteColumn = async (id: string) => {
    setPipelines((prev) =>
      prev.map((pip) => ({ ...pip, columns: pip.columns.filter((c) => c.id !== id) }))
    );
    await fetch(`/api/pipeline/columns/${id}`, { method: "DELETE" });
    setConfirmDeleteColId(null);
  };

  const createPipeline = async () => {
    if (!newPipelineName.trim()) return;
    const res = await fetch("/api/pipelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPipelineName }),
    });
    if (res.ok) {
      const pip: Pipeline = await res.json();
      setPipelines((prev) => [...prev, { ...pip, columns: [] }]);
      setActivePipelineId(pip.id);
      setNewPipelineName("");
      setShowPipelineModal(false);
    }
  };

  const deletePipeline = async (id: string) => {
    const remaining = pipelines.filter((p) => p.id !== id);
    setPipelines(remaining);
    if (activePipelineId === id) setActivePipelineId(remaining[0]?.id ?? null);
    await fetch(`/api/pipelines/${id}`, { method: "DELETE" });
    setConfirmDeletePipelineId(null);
  };

  const allCases = columns.flatMap((c) => c.cases);
  const totalOverdue = allCases.filter((c) => c.overdue).length;
  const altaCol = columns.find((c) => c.label === "Alta Definitiva");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          {[
            { label: "Usuarios activos", value: allCases.length, color: "text-violet-600" },
            { label: "Etapas", value: columns.length, color: "text-blue-600" },
            { label: "Vencidos", value: totalOverdue, color: "text-red-600" },
            { label: "Alta definitiva", value: altaCol?.cases.length ?? 0, color: "text-emerald-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200/60 p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-600 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowPipelineDropdown(!showPipelineDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-violet-300 hover:text-violet-700 transition-all"
            >
              <FolderKanban className="w-4 h-4 text-violet-500" />
              <span className="max-w-[140px] truncate">{activePipeline?.name ?? "Sin pipeline"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <AnimatePresence>
              {showPipelineDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full mt-2 left-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 min-w-[220px] overflow-hidden"
                >
                  <div className="p-2 space-y-0.5">
                    {pipelines.map((pip) => (
                      <div key={pip.id} className="flex items-center gap-1">
                        <button
                          onClick={() => { setActivePipelineId(pip.id); setShowPipelineDropdown(false); }}
                          className={`flex-1 text-left px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                            pip.id === activePipelineId ? "bg-violet-50 text-violet-700" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {pip.name}
                        </button>
                        {pipelines.length > 1 && (
                          <button
                            onClick={() => { setConfirmDeletePipelineId(pip.id); setShowPipelineDropdown(false); }}
                            className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 p-2">
                    <button
                      onClick={() => { setShowPipelineModal(true); setShowPipelineDropdown(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-violet-600 hover:bg-violet-50 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nuevo pipeline
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={openAddCol} className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30">
            <Settings2 className="w-4 h-4" /> Nueva Etapa
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          <AnimatePresence>
            {columns.map((col) => (
              <motion.div
                key={col.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, width: 0 }}
                className={`w-64 rounded-2xl border ${col.color} flex flex-col shrink-0 transition-all ${
                  dragOverColId === col.id ? "ring-2 ring-violet-400 ring-offset-1" : ""
                }`}
                onDragOver={(e) => onDragOver(e, col.id)}
                onDragLeave={() => setDragOverColId(null)}
                onDrop={(e) => onDrop(e, col.id)}
              >
                <div className="p-4 border-b border-inherit">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${col.accent}`} />
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-500 bg-white rounded-lg px-2 py-0.5 border border-slate-200">{col.cases.length}</span>
                      <button onClick={() => openEditCol(col)} className="p-1 text-slate-300 hover:text-violet-500 rounded-lg transition-colors"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => setConfirmDeleteColId(col.id)} className="p-1 text-slate-300 hover:text-red-500 rounded-lg transition-colors"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-slate-700 leading-tight">{col.label}</h3>
                </div>
                <div className="p-3 flex-1 space-y-2.5 min-h-[200px]">
                  {col.cases.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ y: -1, boxShadow: "0 4px 12px rgba(139,92,246,0.12)" }}
                      draggable
                      onDragStart={() => onDragStart(c.id, col.id)}
                      className="bg-white rounded-xl border border-slate-200/80 p-3 group cursor-grab active:cursor-grabbing select-none"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 ${col.accent} rounded-lg flex items-center justify-center text-white text-[10px] font-bold`}>{c.initials}</div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 leading-tight">{c.patient}</p>
                            <p className="text-[10px] text-slate-500">{c.age} años</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <GripVertical className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                          <button onClick={() => deleteCase(col.id, c.id)} className="p-0.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 mb-2">{c.diagnosis}</p>
                      <div className="flex items-center">
                        <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${c.overdue ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                          {c.overdue && <AlertTriangle className="w-2.5 h-2.5" />}
                          <Clock className="w-2.5 h-2.5" />{c.days}d
                        </span>
                      </div>
                    </motion.div>
                  ))}
                  <button onClick={() => openAddCase(col.id)} className="w-full border-2 border-dashed border-slate-200 hover:border-violet-300 text-slate-400 hover:text-violet-500 rounded-xl py-3 text-xs font-medium flex items-center justify-center gap-1.5 transition-all">
                    <Plus className="w-3.5 h-3.5" /> Agregar caso
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <button onClick={openAddCol} className="w-64 shrink-0 rounded-2xl border-2 border-dashed border-slate-200 hover:border-violet-300 text-slate-400 hover:text-violet-500 flex flex-col items-center justify-center gap-2 min-h-[160px] transition-all">
            <Plus className="w-5 h-5" />
            <span className="text-xs font-medium">Nueva etapa</span>
          </button>
        </div>
      </motion.div>

      <Modal open={showCaseModal} onClose={() => setShowCaseModal(false)} title="Agregar Caso" subtitle={activeColumnId ? columns.find((c) => c.id === activeColumnId)?.label : undefined} footer={<button onClick={addCase} disabled={!newCase.patient.trim()} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30">Agregar Caso</button>}>
        <div className="space-y-4">
          <div><label className="text-sm font-semibold text-slate-700 block mb-1.5">Nombre del paciente *</label><input autoFocus type="text" value={newCase.patient} onChange={(e) => setNewCase({ ...newCase, patient: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addCase()} placeholder="Nombre completo" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-semibold text-slate-700 block mb-1.5">Edad</label><input type="number" min={0} value={newCase.age || ""} onChange={(e) => setNewCase({ ...newCase, age: parseInt(e.target.value) || 0 })} placeholder="Años" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" /></div>
            <div><label className="text-sm font-semibold text-slate-700 block mb-1.5">Días en etapa</label><input type="number" min={0} value={newCase.days || ""} onChange={(e) => setNewCase({ ...newCase, days: parseInt(e.target.value) || 0 })} placeholder="0" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" /></div>
          </div>
          <div><label className="text-sm font-semibold text-slate-700 block mb-1.5">Diagnóstico</label><input type="text" value={newCase.diagnosis} onChange={(e) => setNewCase({ ...newCase, diagnosis: e.target.value })} placeholder="Diagnóstico principal" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" /></div>
        </div>
      </Modal>

      <Modal open={showColModal} onClose={() => setShowColModal(false)} title={editingCol ? "Editar Etapa" : "Nueva Etapa"} footer={<button onClick={saveColumn} disabled={!newColName.trim()} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30">{editingCol ? "Guardar cambios" : "Crear Etapa"}</button>}>
        <div className="space-y-5">
          <div><label className="text-sm font-semibold text-slate-700 block mb-1.5">Nombre de la etapa *</label><input autoFocus type="text" value={newColName} onChange={(e) => setNewColName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveColumn()} placeholder="Ej. Seguimiento, Cierre, etc." className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" /></div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((p, i) => (<button key={i} onClick={() => setNewColPalette(i)} className={`w-8 h-8 rounded-lg ${p.accent} transition-all ${newColPalette === i ? "ring-2 ring-offset-2 ring-violet-500 scale-110" : "opacity-60 hover:opacity-100"}`} />))}
            </div>
          </div>
          {newColName && (<div className={`rounded-xl border p-3 ${PALETTE[newColPalette].color}`}><div className="flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded-full ${PALETTE[newColPalette].accent}`} /><span className="text-sm font-bold text-slate-700">{newColName}</span></div></div>)}
        </div>
      </Modal>

      <Modal open={!!confirmDeleteColId} onClose={() => setConfirmDeleteColId(null)} title="Eliminar Etapa" footer={<div className="flex gap-3"><button onClick={() => setConfirmDeleteColId(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">Cancelar</button><button onClick={() => confirmDeleteColId && deleteColumn(confirmDeleteColId)} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all">Eliminar</button></div>}>
        <p className="text-sm text-slate-600">
          ¿Eliminar la etapa <strong>&quot;{columns.find((c) => c.id === confirmDeleteColId)?.label}&quot;</strong>?
          {(columns.find((c) => c.id === confirmDeleteColId)?.cases.length ?? 0) > 0 && (
            <span className="block mt-2 text-amber-600 font-medium">⚠️ Tiene {columns.find((c) => c.id === confirmDeleteColId)?.cases.length} caso(s) que también serán eliminados.</span>
          )}
        </p>
      </Modal>

      <Modal open={showPipelineModal} onClose={() => setShowPipelineModal(false)} title="Nuevo Pipeline" footer={<button onClick={createPipeline} disabled={!newPipelineName.trim()} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30">Crear Pipeline</button>}>
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nombre del pipeline *</label>
          <input autoFocus type="text" value={newPipelineName} onChange={(e) => setNewPipelineName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createPipeline()} placeholder="Ej. Adultos, Infantil, Neurológico..." className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          <p className="text-xs text-slate-400 mt-2">Cada pipeline tiene sus propias etapas independientes.</p>
        </div>
      </Modal>

      <Modal open={!!confirmDeletePipelineId} onClose={() => setConfirmDeletePipelineId(null)} title="Eliminar Pipeline" footer={<div className="flex gap-3"><button onClick={() => setConfirmDeletePipelineId(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">Cancelar</button><button onClick={() => confirmDeletePipelineId && deletePipeline(confirmDeletePipelineId)} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all">Eliminar</button></div>}>
        <p className="text-sm text-slate-600">
          ¿Eliminar el pipeline <strong>&quot;{pipelines.find((p) => p.id === confirmDeletePipelineId)?.name}&quot;</strong>? Se eliminarán todas sus etapas y casos.
        </p>
      </Modal>
    </div>
  );
}
