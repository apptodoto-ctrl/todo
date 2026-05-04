"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Clock, AlertTriangle, Trash2, Pencil, X, Settings2,
  ChevronDown, FolderKanban, Users, Layers, TrendingUp, Award,
  GripVertical, Search, Filter, MoreHorizontal, Zap,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  { color: "bg-violet-50 border-violet-200", accent: "bg-violet-500", gradient: "from-violet-500 to-purple-600", ring: "ring-violet-400", text: "text-violet-600", light: "bg-violet-100", hex: "#8b5cf6" },
  { color: "bg-blue-50 border-blue-200", accent: "bg-blue-500", gradient: "from-blue-500 to-cyan-600", ring: "ring-blue-400", text: "text-blue-600", light: "bg-blue-100", hex: "#3b82f6" },
  { color: "bg-indigo-50 border-indigo-200", accent: "bg-indigo-500", gradient: "from-indigo-500 to-blue-600", ring: "ring-indigo-400", text: "text-indigo-600", light: "bg-indigo-100", hex: "#6366f1" },
  { color: "bg-amber-50 border-amber-200", accent: "bg-amber-500", gradient: "from-amber-500 to-orange-500", ring: "ring-amber-400", text: "text-amber-600", light: "bg-amber-100", hex: "#f59e0b" },
  { color: "bg-orange-50 border-orange-200", accent: "bg-orange-500", gradient: "from-orange-500 to-red-500", ring: "ring-orange-400", text: "text-orange-600", light: "bg-orange-100", hex: "#f97316" },
  { color: "bg-emerald-50 border-emerald-200", accent: "bg-emerald-500", gradient: "from-emerald-500 to-teal-600", ring: "ring-emerald-400", text: "text-emerald-600", light: "bg-emerald-100", hex: "#10b981" },
  { color: "bg-pink-50 border-pink-200", accent: "bg-pink-500", gradient: "from-pink-500 to-rose-600", ring: "ring-pink-400", text: "text-pink-600", light: "bg-pink-100", hex: "#ec4899" },
  { color: "bg-cyan-50 border-cyan-200", accent: "bg-cyan-500", gradient: "from-cyan-500 to-blue-500", ring: "ring-cyan-400", text: "text-cyan-600", light: "bg-cyan-100", hex: "#06b6d4" },
  { color: "bg-rose-50 border-rose-200", accent: "bg-rose-500", gradient: "from-rose-500 to-pink-600", ring: "ring-rose-400", text: "text-rose-600", light: "bg-rose-100", hex: "#f43f5e" },
];

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-pink-500 to-rose-500",
  "from-indigo-500 to-blue-600",
];

function getGradient(initials: string) {
  const i = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[i];
}

function getPaletteByAccent(accent: string) {
  return PALETTE.find((p) => p.accent === accent) ?? PALETTE[0];
}

// ─── Sortable Card ─────────────────────────────────────────────────────────────
function KanbanCard({
  c, colAccent, onDelete, isDragging = false,
}: { c: Case; colAccent: string; onDelete: () => void; isDragging?: boolean }) {
  const pal = getPaletteByAccent(colAccent);
  const grad = getGradient(c.initials);

  return (
    <div
      className={`group relative bg-white rounded-2xl border border-slate-200/80 p-4 select-none transition-all duration-200 ${
        isDragging
          ? "shadow-2xl shadow-violet-500/20 rotate-1 scale-105 border-violet-300"
          : "hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/80"
      }`}
    >
      {/* Accent strip */}
      <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl bg-gradient-to-b ${pal.gradient} opacity-70`} />

      <div className="pl-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white text-[11px] font-bold shadow-sm shrink-0`}>
              {c.initials}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 leading-tight">{c.patient}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{c.age} años · {c.therapist}</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3.5 h-3.5 text-slate-400 cursor-grab" />
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 text-slate-700 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Diagnosis */}
        <p className="text-[12px] text-slate-600 mb-3 leading-snug line-clamp-2">{c.diagnosis}</p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
            c.overdue
              ? "bg-red-50 text-red-600 border border-red-200"
              : c.days > 14
              ? "bg-amber-50 text-amber-600 border border-amber-200"
              : "bg-slate-100 text-slate-500 border border-slate-200"
          }`}>
            {c.overdue && <AlertTriangle className="w-2.5 h-2.5" />}
            <Clock className="w-2.5 h-2.5" />
            {c.days}d
          </span>
          <div className="flex items-center gap-1.5">
            {c.overdue && (
              <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                Vencido
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableCard({ c, colAccent, onDelete }: { c: Case; colAccent: string; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <KanbanCard c={c} colAccent={colAccent} onDelete={onDelete} />
    </div>
  );
}

// ─── Column ────────────────────────────────────────────────────────────────────
function KanbanColumn({
  col, isOver, onAddCase, onEditCol, onDeleteCol, onDeleteCase,
}: {
  col: Column;
  isOver: boolean;
  onAddCase: () => void;
  onEditCol: () => void;
  onDeleteCol: () => void;
  onDeleteCase: (caseId: number) => void;
}) {
  const pal = getPaletteByAccent(col.accent);
  const caseIds = col.cases.map((c) => c.id);
  const { setNodeRef: setColRef } = useDroppable({ id: col.id });

  return (
    <motion.div
      ref={setColRef}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, width: 0, marginRight: 0 }}
      className={`w-72 shrink-0 flex flex-col rounded-2xl transition-all duration-200 ${
        isOver
          ? `ring-2 ${pal.ring} ring-offset-2 bg-white shadow-xl`
          : "bg-slate-50/80"
      }`}
      style={{ border: "1px solid", borderColor: isOver ? pal.hex : "#e2e8f0" }}
    >
      {/* Column header */}
      <div className="p-4 pb-3">
        <div className={`h-1 w-full rounded-full bg-gradient-to-r ${pal.gradient} mb-3 opacity-80`} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800 leading-tight">{col.label}</h3>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${pal.light} ${pal.text}`}>
              {col.cases.length}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={onEditCol}
              className="p-1.5 text-slate-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={onDeleteCol}
              className="p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 px-3 pb-3 overflow-y-auto max-h-[calc(100vh-340px)] min-h-[120px] space-y-2.5">
        <SortableContext items={caseIds} strategy={verticalListSortingStrategy}>
          {col.cases.map((c) => (
            <SortableCard key={c.id} c={c} colAccent={col.accent} onDelete={() => onDeleteCase(c.id)} />
          ))}
        </SortableContext>

        {col.cases.length === 0 && !isOver && (
          <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
            <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center mb-2">
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-400 font-medium">Sin pacientes</p>
          </div>
        )}

        {isOver && (
          <div className={`h-16 rounded-xl border-2 border-dashed ${pal.ring.replace("ring-", "border-")} bg-gradient-to-br ${pal.gradient} bg-opacity-5 flex items-center justify-center`}>
            <p className={`text-xs font-semibold ${pal.text}`}>Soltar aquí</p>
          </div>
        )}
      </div>

      {/* Add button */}
      <div className="p-3 pt-0">
        <button
          onClick={onAddCase}
          className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed text-xs font-semibold transition-all ${pal.text} hover:${pal.light} border-slate-200 hover:border-current`}
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar paciente
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
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
  const [pipelinePatients, setPipelinePatients] = useState<{ id: number; name: string; age: number; diagnosis: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overColId, setOverColId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    fetch("/api/pipelines")
      .then((r) => r.json())
      .then(async (data: Pipeline[]) => {
        let list = Array.isArray(data) ? data : [];
        // Auto-create default pipeline if none exist
        if (list.length === 0) {
          const res = await fetch("/api/pipelines", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Pipeline Principal" }),
          });
          if (res.ok) {
            const pip: Pipeline = await res.json();
            // Create default columns
            const defaultCols = [
              { label: "Evaluación Inicial", color: "bg-violet-50 border-violet-200", accent: "bg-violet-500" },
              { label: "En Tratamiento", color: "bg-blue-50 border-blue-200", accent: "bg-blue-500" },
              { label: "Seguimiento", color: "bg-amber-50 border-amber-200", accent: "bg-amber-500" },
              { label: "Alta Definitiva", color: "bg-emerald-50 border-emerald-200", accent: "bg-emerald-500" },
            ];
            const cols: Column[] = [];
            for (const col of defaultCols) {
              const cr = await fetch("/api/pipeline/columns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...col, pipelineId: pip.id }),
              });
              if (cr.ok) cols.push({ ...(await cr.json()), cases: [] });
            }
            list = [{ ...pip, columns: cols }];
          }
        }
        setPipelines(list);
        if (list.length > 0) setActivePipelineId(list[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    fetch("/api/patients")
      .then((r) => r.json())
      .then((data) => setPipelinePatients(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPipelineDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activePipeline = pipelines.find((p) => p.id === activePipelineId) ?? null;
  const columns = activePipeline?.columns.slice().sort((a, b) => a.order - b.order) ?? [];

  // Search filter
  const filteredColumns = columns.map((col) => ({
    ...col,
    cases: searchQuery
      ? col.cases.filter(
          (c) =>
            c.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.diagnosis.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : col.cases,
  }));

  const allCases = columns.flatMap((c) => c.cases);
  const totalOverdue = allCases.filter((c) => c.overdue).length;
  const altaCol = columns.find((c) => c.label.toLowerCase().includes("alta"));
  const activeCase = activeId ? allCases.find((c) => c.id === activeId) : null;
  const activeCaseCol = activeCase ? columns.find((col) => col.cases.some((c) => c.id === activeId)) : null;

  // ─── DnD handlers ────────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) { setOverColId(null); return; }
    // over could be a column id (string) or a case id (number)
    const overId = over.id;
    const overColumn = columns.find((c) => c.id === overId || c.cases.some((ca) => ca.id === overId));
    setOverColId(overColumn?.id ?? null);
  }, [columns]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverColId(null);
    if (!over) return;

    const activeCase = allCases.find((c) => c.id === active.id);
    if (!activeCase) return;

    // Determine target column
    const overId = over.id;
    let targetColId: string | null = null;
    let targetCol = columns.find((c) => c.id === overId);
    if (targetCol) {
      targetColId = targetCol.id;
    } else {
      // over a card — find its column
      targetCol = columns.find((c) => c.cases.some((ca) => ca.id === overId));
      targetColId = targetCol?.id ?? null;
    }
    if (!targetColId) return;

    const sourceColId = activeCase.columnId;

    if (sourceColId === targetColId) {
      // Reorder within column
      const col = columns.find((c) => c.id === sourceColId);
      if (!col) return;
      const oldIndex = col.cases.findIndex((c) => c.id === active.id);
      const newIndex = col.cases.findIndex((c) => c.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const reordered = arrayMove(col.cases, oldIndex, newIndex);
      setPipelines((prev) =>
        prev.map((pip) => ({
          ...pip,
          columns: pip.columns.map((c) => (c.id === sourceColId ? { ...c, cases: reordered } : c)),
        }))
      );
    } else {
      // Move between columns
      setPipelines((prev) =>
        prev.map((pip) => ({
          ...pip,
          columns: pip.columns.map((col) => {
            if (col.id === sourceColId) return { ...col, cases: col.cases.filter((c) => c.id !== active.id) };
            if (col.id === targetColId) {
              return { ...col, cases: [...col.cases, { ...activeCase, columnId: targetColId! }] };
            }
            return col;
          }),
        }))
      );
      await fetch(`/api/pipeline/cases/${active.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId: targetColId }),
      });
    }
  }, [allCases, columns]);

  // ─── Case CRUD ───────────────────────────────────────────────────────────────
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

  // ─── Column CRUD ─────────────────────────────────────────────────────────────
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
              c.id === editingCol.id ? { ...c, label: newColName, color: palette.color, accent: palette.accent } : c
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
            pip.id === activePipelineId ? { ...pip, columns: [...pip.columns, { ...col, cases: [] }] } : pip
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

  // ─── Pipeline CRUD ───────────────────────────────────────────────────────────
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

  // ─── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center animate-pulse">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm text-slate-400 font-medium">Cargando pipeline…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-full">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Pacientes activos", value: allCases.length, icon: Users, from: "from-violet-500", to: "to-purple-600", bg: "bg-violet-50", text: "text-violet-700" },
            { label: "Etapas", value: columns.length, icon: Layers, from: "from-blue-500", to: "to-cyan-500", bg: "bg-blue-50", text: "text-blue-700" },
            { label: "Vencidos", value: totalOverdue, icon: AlertTriangle, from: "from-red-500", to: "to-rose-600", bg: "bg-red-50", text: "text-red-700" },
            { label: "Alta definitiva", value: altaCol?.cases.length ?? 0, icon: Award, from: "from-emerald-500", to: "to-teal-500", bg: "bg-emerald-50", text: "text-emerald-700" },
          ].map((s) => (
            <motion.div
              key={s.label}
              whileHover={{ y: -2 }}
              className="bg-white rounded-2xl border border-slate-200/60 p-4 flex items-center gap-3 shadow-sm"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.from} ${s.to} flex items-center justify-center shadow-sm shrink-0`}>
                <s.icon className="w-4.5 h-4.5 text-white w-5 h-5" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
                <p className="text-[11px] text-slate-500 font-medium leading-tight">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar paciente o diagnóstico…"
              className="w-full pl-9 pr-4 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Pipeline selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowPipelineDropdown(!showPipelineDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700 transition-all shadow-sm"
            >
              <FolderKanban className="w-4 h-4 text-violet-500" />
              <span className="max-w-[140px] truncate">{activePipeline?.name ?? "Sin pipeline"}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showPipelineDropdown ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {showPipelineDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  className="absolute top-full mt-2 left-0 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 z-20 min-w-[220px] overflow-hidden"
                >
                  <div className="p-2 space-y-0.5">
                    {pipelines.map((pip) => (
                      <div key={pip.id} className="flex items-center gap-1">
                        <button
                          onClick={() => { setActivePipelineId(pip.id); setShowPipelineDropdown(false); }}
                          className={`flex-1 text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                            pip.id === activePipelineId
                              ? "bg-violet-50 text-violet-700"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {pip.id === activePipelineId && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
                            {pip.name}
                          </span>
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
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-violet-600 hover:bg-violet-50 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nuevo pipeline
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Add column */}
          <button
            onClick={openAddCol}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/25 shrink-0"
          >
            <Settings2 className="w-4 h-4" /> Nueva etapa
          </button>
        </div>
      </motion.div>

      {/* ── Kanban board ────────────────────────────────────────────────────── */}
      {activePipeline ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="overflow-x-auto pb-6"
          >
            <div className="flex gap-4 min-w-max items-start pt-1">
              <AnimatePresence mode="popLayout">
                {filteredColumns.map((col) => (
                  <KanbanColumn
                    key={col.id}
                    col={col}
                    isOver={overColId === col.id}
                    onAddCase={() => openAddCase(col.id)}
                    onEditCol={() => openEditCol(col)}
                    onDeleteCol={() => setConfirmDeleteColId(col.id)}
                    onDeleteCase={(caseId) => deleteCase(col.id, caseId)}
                  />
                ))}
              </AnimatePresence>

              {/* Add column ghost */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={openAddCol}
                className="w-72 shrink-0 rounded-2xl border-2 border-dashed border-slate-200 hover:border-violet-300 hover:bg-violet-50/30 text-slate-400 hover:text-violet-500 flex flex-col items-center justify-center gap-2.5 min-h-[180px] transition-all group"
              >
                <div className="w-10 h-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold">Nueva etapa</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Drag overlay */}
          <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {activeCase && activeCaseCol ? (
              <div className="w-72 rotate-2 scale-105">
                <KanbanCard c={activeCase} colAccent={activeCaseCol.accent} onDelete={() => {}} isDragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-200 flex items-center justify-center">
            <Zap className="w-7 h-7 text-violet-500" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-800">Sin pipelines</p>
            <p className="text-sm text-slate-500 mt-1">Crea tu primer pipeline para comenzar</p>
          </div>
          <button
            onClick={() => setShowPipelineModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-violet-500/30 hover:from-violet-400 hover:to-purple-500 transition-all"
          >
            <Plus className="w-4 h-4" /> Crear pipeline
          </button>
        </motion.div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <Modal
        open={showCaseModal}
        onClose={() => setShowCaseModal(false)}
        title="Agregar Paciente"
        subtitle={activeColumnId ? columns.find((c) => c.id === activeColumnId)?.label : undefined}
        footer={
          <button
            onClick={addCase}
            disabled={!newCase.patient.trim()}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30"
          >
            Agregar Paciente
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Paciente *</label>
            <select
              autoFocus
              value={newCase.patient}
              onChange={(e) => {
                const p = pipelinePatients.find((x) => x.name === e.target.value);
                setNewCase({ ...newCase, patient: e.target.value, age: p?.age ?? newCase.age, diagnosis: p?.diagnosis ?? newCase.diagnosis });
              }}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
            >
              <option value="">Seleccionar paciente registrado…</option>
              {pipelinePatients.map((p) => (<option key={p.id} value={p.name}>{p.name}</option>))}
            </select>
            <input
              type="text"
              value={newCase.patient}
              onChange={(e) => setNewCase({ ...newCase, patient: e.target.value })}
              placeholder="O escribe nombre manualmente"
              className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Edad</label>
              <input type="number" min={0} value={newCase.age || ""} onChange={(e) => setNewCase({ ...newCase, age: parseInt(e.target.value) || 0 })} placeholder="Años" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Días en etapa</label>
              <input type="number" min={0} value={newCase.days || ""} onChange={(e) => setNewCase({ ...newCase, days: parseInt(e.target.value) || 0 })} placeholder="0" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Diagnóstico</label>
            <input type="text" value={newCase.diagnosis} onChange={(e) => setNewCase({ ...newCase, diagnosis: e.target.value })} placeholder="Diagnóstico principal" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
        </div>
      </Modal>

      <Modal
        open={showColModal}
        onClose={() => setShowColModal(false)}
        title={editingCol ? "Editar Etapa" : "Nueva Etapa"}
        footer={
          <button
            onClick={saveColumn}
            disabled={!newColName.trim()}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30"
          >
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
              placeholder="Ej. Seguimiento, Cierre, Alta…"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-3">Color de la etapa</label>
            <div className="grid grid-cols-9 gap-2">
              {PALETTE.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setNewColPalette(i)}
                  className={`w-8 h-8 rounded-xl bg-gradient-to-br ${p.gradient} transition-all ${
                    newColPalette === i ? "ring-2 ring-offset-2 ring-violet-500 scale-110" : "opacity-50 hover:opacity-90 hover:scale-105"
                  }`}
                />
              ))}
            </div>
          </div>
          {newColName && (
            <div className={`rounded-xl border p-3.5 ${PALETTE[newColPalette].color}`}>
              <div className={`h-1 w-16 rounded-full bg-gradient-to-r ${PALETTE[newColPalette].gradient} mb-2`} />
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${PALETTE[newColPalette].accent}`} />
                <span className="text-sm font-bold text-slate-700">{newColName}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={!!confirmDeleteColId}
        onClose={() => setConfirmDeleteColId(null)}
        title="Eliminar Etapa"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setConfirmDeleteColId(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">Cancelar</button>
            <button onClick={() => confirmDeleteColId && deleteColumn(confirmDeleteColId)} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all">Eliminar</button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          ¿Eliminar la etapa <strong>&quot;{columns.find((c) => c.id === confirmDeleteColId)?.label}&quot;</strong>?
          {(columns.find((c) => c.id === confirmDeleteColId)?.cases.length ?? 0) > 0 && (
            <span className="block mt-2 p-2.5 rounded-lg bg-amber-50 text-amber-700 font-medium text-xs border border-amber-200">
              ⚠️ Tiene {columns.find((c) => c.id === confirmDeleteColId)?.cases.length} caso(s) que también serán eliminados.
            </span>
          )}
        </p>
      </Modal>

      <Modal
        open={showPipelineModal}
        onClose={() => setShowPipelineModal(false)}
        title="Nuevo Pipeline"
        footer={
          <button
            onClick={createPipeline}
            disabled={!newPipelineName.trim()}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30"
          >
            Crear Pipeline
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nombre del pipeline *</label>
            <input
              autoFocus
              type="text"
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createPipeline()}
              placeholder="Ej. Adultos, Infantil, Neurológico…"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
          </div>
          <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3 border border-slate-100">
            Cada pipeline tiene sus propias etapas independientes. Puedes crear pipelines separados por especialidad, terapeuta o tipo de intervención.
          </p>
        </div>
      </Modal>

      <Modal
        open={!!confirmDeletePipelineId}
        onClose={() => setConfirmDeletePipelineId(null)}
        title="Eliminar Pipeline"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setConfirmDeletePipelineId(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">Cancelar</button>
            <button onClick={() => confirmDeletePipelineId && deletePipeline(confirmDeletePipelineId)} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all">Eliminar todo</button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          ¿Eliminar el pipeline <strong>&quot;{pipelines.find((p) => p.id === confirmDeletePipelineId)?.name}&quot;</strong>?
          <span className="block mt-2 p-2.5 rounded-lg bg-red-50 text-red-700 font-medium text-xs border border-red-200">
            ⚠️ Se eliminarán todas sus etapas y los casos que contienen. Esta acción es irreversible.
          </span>
        </p>
      </Modal>
    </div>
  );
}


