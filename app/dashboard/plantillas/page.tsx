"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Trash2, Pencil, Archive, Copy, GripVertical, X, Sparkles, Printer, UserPlus, Send, FileSignature, Eye, EyeOff } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { FIELD_TYPE_LABELS, needsOptions, type FieldType, type FormSection } from "@/lib/formTemplates";
import { CONSENT_KINDS } from "@/lib/consents";
import { printHtml, blankFormHtml } from "@/lib/printForm";
import { useCurrentUser } from "@/lib/useCurrentUser";

interface ConsentTemplate { id: number; name: string; kind: string; body: string; usos: number }
interface PatientOption { id: number; name: string; guardianEmail: string; email: string }

interface Template {
  id: number;
  name: string;
  description: string;
  sections: FormSection[];
  origin: string;
  archived: boolean;
  usos: number;
}

const inputCls =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all";

const uid = () => Math.random().toString(36).slice(2, 9);

export default function PlantillasPage() {
  const router = useRouter();
  const { name: currentUserName } = useCurrentUser();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Elegir un usuario: para llenar una plantilla o para enviarle un documento a su familia
  const [patients, setPatients] = useState<PatientOption[] | null>(null);
  const [picker, setPicker] = useState<{ mode: "llenar"; template: Template } | { mode: "enviar"; consent: ConsentTemplate } | null>(null);
  const [pickerPatient, setPickerPatient] = useState("");
  const [pickerEmail, setPickerEmail] = useState("");
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pickerMsg, setPickerMsg] = useState("");

  // Documentos que la familia lee y acepta en línea
  const [consents, setConsents] = useState<ConsentTemplate[]>([]);
  const [editingConsent, setEditingConsent] = useState<ConsentTemplate | null>(null);
  const [savingConsent, setSavingConsent] = useState(false);

  const load = useCallback(async () => {
    try {
      const [res, resC] = await Promise.all([fetch("/api/forms/templates?archived=1"), fetch("/api/consents/templates")]);
      const data = await res.json();
      if (Array.isArray(data)) setTemplates(data);
      const dataC = await resC.json();
      if (Array.isArray(dataC)) setConsents(dataC);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const abrirPicker = async (p: NonNullable<typeof picker>) => {
    setPicker(p); setPickerPatient(""); setPickerEmail(""); setPickerMsg("");
    if (patients === null) {
      const res = await fetch("/api/patients");
      const d = await res.json();
      setPatients(Array.isArray(d) ? d : []);
    }
  };

  const confirmarPicker = async () => {
    if (!picker || !pickerPatient) return;
    if (picker.mode === "llenar") {
      router.push(`/dashboard/usuarios?paciente=${pickerPatient}&plantilla=${picker.template.id}`);
      return;
    }
    setPickerBusy(true); setPickerMsg("");
    const res = await fetch("/api/consents/requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: Number(pickerPatient), templateId: picker.consent.id, email: pickerEmail || undefined }),
    });
    const d = await res.json().catch(() => null);
    setPickerBusy(false);
    if (!res.ok) { setPickerMsg(d?.error ?? "No se pudo enviar."); return; }
    setPickerMsg(`Enviado a ${d.sentTo}. Te avisaremos en la ficha del usuario cuando lo acepten.`);
    await load();
  };

  const imprimirEnBlanco = (t: Template) => printHtml(blankFormHtml(t.name, t.sections, currentUserName || ""));

  const usarDocumentosTipo = async () => {
    const res = await fetch("/api/consents/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ useDefaults: true }) });
    if (res.ok) await load();
  };

  const nuevoConsent = async () => {
    const res = await fetch("/api/consents/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Documento nuevo", kind: "otro", body: "" }) });
    if (res.ok) { const c = await res.json(); await load(); setEditingConsent({ ...c, usos: 0 }); }
  };

  const guardarConsent = async () => {
    if (!editingConsent) return;
    if (!editingConsent.name.trim()) { setError("Ponle un nombre al documento."); return; }
    setSavingConsent(true);
    const res = await fetch(`/api/consents/templates/${editingConsent.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingConsent.name, kind: editingConsent.kind, body: editingConsent.body }),
    });
    setSavingConsent(false);
    if (res.ok) { setEditingConsent(null); setError(""); await load(); }
    else setError("No se pudo guardar. Inténtalo de nuevo.");
  };

  const quitarConsent = async (c: ConsentTemplate) => {
    if (!confirm(`¿Quitar "${c.name}"? Los envíos ya hechos conservan su texto.`)) return;
    await fetch(`/api/consents/templates/${c.id}`, { method: "DELETE" });
    await load();
  };

  const crearVacia = async () => {
    const res = await fetch("/api/forms/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Plantilla nueva", sections: [{ id: uid(), title: "Sección 1", fields: [] }] }),
    });
    if (res.ok) { const t = await res.json(); await load(); setEditing({ ...t, usos: 0 }); }
  };

  const crearFichaInicio = async () => {
    const res = await fetch("/api/forms/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useFichaInicio: true }),
    });
    if (res.ok) await load();
  };

  const guardar = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { setError("Ponle un nombre a la plantilla."); return; }
    setSaving(true);
    const res = await fetch(`/api/forms/templates/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editing.name, description: editing.description, sections: editing.sections }),
    });
    setSaving(false);
    if (res.ok) { setEditing(null); setError(""); await load(); }
    else setError("No se pudo guardar. Inténtalo de nuevo.");
  };

  const archivar = async (t: Template) => {
    await fetch(`/api/forms/templates/${t.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !t.archived }),
    });
    await load();
  };

  const borrar = async (t: Template) => {
    if (!confirm(`¿Borrar la plantilla "${t.name}"?`)) return;
    const res = await fetch(`/api/forms/templates/${t.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => null); alert(d?.error ?? "No se pudo borrar."); return; }
    await load();
  };

  // --- edición de secciones y campos
  const patch = (fn: (s: FormSection[]) => FormSection[]) =>
    setEditing((prev) => (prev ? { ...prev, sections: fn(prev.sections) } : prev));

  const addSection = () => patch((s) => [...s, { id: uid(), title: `Sección ${s.length + 1}`, fields: [] }]);
  const removeSection = (si: number) => patch((s) => s.filter((_, i) => i !== si));
  const moveSection = (si: number, delta: number) =>
    patch((s) => { const n = [...s]; const t = si + delta; if (t < 0 || t >= n.length) return n; [n[si], n[t]] = [n[t], n[si]]; return n; });
  const addField = (si: number) =>
    patch((s) => s.map((sec, i) => i === si ? { ...sec, fields: [...sec.fields, { id: uid(), label: "", type: "texto" as FieldType }] } : sec));
  const removeField = (si: number, fi: number) =>
    patch((s) => s.map((sec, i) => i === si ? { ...sec, fields: sec.fields.filter((_, j) => j !== fi) } : sec));
  const setField = (si: number, fi: number, data: Partial<FormSection["fields"][number]>) =>
    patch((s) => s.map((sec, i) => i === si ? { ...sec, fields: sec.fields.map((f, j) => j === fi ? { ...f, ...data } : f) } : sec));

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 animate-pulse" /></div>;
  }

  const activas = templates.filter((t) => !t.archived);
  const archivadas = templates.filter((t) => t.archived);
  const tieneFicha = templates.some((t) => t.origin === "todo");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {activas.length === 0 ? "Aún no tienes plantillas" : `${activas.length} plantilla${activas.length === 1 ? "" : "s"} en uso`}
        </p>
        <div className="flex flex-wrap gap-2">
          {archivadas.length > 0 && (
            <button onClick={() => setShowArchived((v) => !v)} className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-50 transition-all">
              {showArchived ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {showArchived ? "Ocultar archivadas" : `Ver archivadas (${archivadas.length})`}
            </button>
          )}
          {!tieneFicha && (
            <button onClick={crearFichaInicio} className="flex items-center gap-1.5 bg-white border border-violet-200 text-violet-700 px-3 py-2.5 rounded-xl font-medium text-sm hover:bg-violet-50 transition-all">
              <Sparkles className="w-4 h-4" /> Usar la Ficha de inicio
            </button>
          )}
          <button onClick={crearVacia} className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30">
            <Plus className="w-4 h-4" /> Nueva plantilla
          </button>
        </div>
      </motion.div>

      {activas.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-8 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="font-semibold text-slate-600">Crea tus propios formularios</p>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Fichas de admisión, entrevistas o pautas de evaluación, con los campos que tú usas. Las llenas dentro de TOdo o las imprimes para llenarlas a mano.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {[...activas, ...(showArchived ? archivadas : [])].map((t) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-2xl border p-4 ${t.archived ? "border-slate-200/60 opacity-60" : "border-slate-200/60"}`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                  {t.origin === "todo" && <span className="text-[10px] font-bold uppercase tracking-wide text-violet-600 bg-violet-50 px-2 py-0.5 rounded">Plantilla TOdo</span>}
                  {t.archived && <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Archivada</span>}
                </div>
                {t.description && <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>}
                <p className="text-[11px] text-slate-400 mt-1">
                  {t.sections.length} {t.sections.length === 1 ? "sección" : "secciones"} ·{" "}
                  {t.sections.reduce((a, s) => a + s.fields.length, 0)} campos ·{" "}
                  {t.usos === 0 ? "sin usar" : `usada en ${t.usos} ${t.usos === 1 ? "ficha" : "fichas"}`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={() => { setError(""); setEditing(t); }} className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-lg hover:bg-violet-100 transition-colors">
                <Pencil className="w-3 h-3" /> Editar
              </button>
              {!t.archived && (
                <>
                  <button onClick={() => abrirPicker({ mode: "llenar", template: t })} className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-white border border-violet-200 px-2.5 py-1 rounded-lg hover:bg-violet-50 transition-colors">
                    <UserPlus className="w-3 h-3" /> Llenar para un usuario
                  </button>
                  <button onClick={() => imprimirEnBlanco(t)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                    <Printer className="w-3 h-3" /> Imprimir en blanco
                  </button>
                </>
              )}
              <button onClick={() => archivar(t)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                <Archive className="w-3 h-3" /> {t.archived ? "Reactivar" : "Archivar"}
              </button>
              <button onClick={() => borrar(t)} className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-100 transition-colors ml-auto">
                <Trash2 className="w-3 h-3" /> Borrar
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Documentos que la familia lee y acepta en línea */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pt-4 border-t border-slate-200/60 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileSignature className="w-4 h-4 text-violet-600" /> Documentos para la familia</h3>
            <p className="text-xs text-slate-500 mt-0.5">Consentimientos, compromisos y políticas. Se envían por correo, la familia los lee y acepta con un clic, y quedan guardados en la ficha del usuario con fecha y hora.</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {consents.length < Object.keys(CONSENT_KINDS).length - 1 && (
              <button onClick={usarDocumentosTipo} className="flex items-center gap-1.5 bg-white border border-violet-200 text-violet-700 px-3 py-2 rounded-xl font-medium text-xs hover:bg-violet-50 transition-all">
                <Sparkles className="w-3.5 h-3.5" /> Usar los documentos tipo
              </button>
            )}
            <button onClick={nuevoConsent} className="flex items-center gap-1.5 bg-slate-800 text-white px-3 py-2 rounded-xl font-medium text-xs hover:bg-slate-700 transition-all">
              <Plus className="w-3.5 h-3.5" /> Nuevo documento
            </button>
          </div>
        </div>

        {consents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 text-center">
            <p className="text-sm text-slate-500">Aún no tienes documentos. Puedes partir con los cinco documentos tipo (consentimiento informado, compromiso terapéutico, política de cancelación, términos y política de devolución) y editarlos a tu gusto.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {consents.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200/60 p-4">
                <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{CONSENT_KINDS[c.kind] ?? "Documento"} · {c.usos === 0 ? "sin enviar" : `enviado ${c.usos} ${c.usos === 1 ? "vez" : "veces"}`}</p>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{c.body || "Sin texto todavía."}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => abrirPicker({ mode: "enviar", consent: c })} disabled={!c.body.trim()} className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-violet-500 to-purple-600 px-2.5 py-1 rounded-lg hover:from-violet-400 hover:to-purple-500 disabled:opacity-40 transition-all">
                    <Send className="w-3 h-3" /> Enviar a una familia
                  </button>
                  <button onClick={() => { setError(""); setEditingConsent(c); }} className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-lg hover:bg-violet-100 transition-colors">
                    <Pencil className="w-3 h-3" /> Editar
                  </button>
                  <button onClick={() => quitarConsent(c)} className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-100 transition-colors ml-auto">
                    <Trash2 className="w-3 h-3" /> Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <Modal
        open={!!picker}
        onClose={() => setPicker(null)}
        title={picker?.mode === "llenar" ? `Llenar «${picker.template.name}»` : picker ? `Enviar «${picker.consent.name}»` : ""}
        footer={
          <button onClick={confirmarPicker} disabled={!pickerPatient || pickerBusy} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 transition-all">
            {pickerBusy ? "Enviando..." : picker?.mode === "llenar" ? "Abrir la ficha" : "Enviar por correo"}
          </button>
        }
      >
        {picker && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">¿Para qué usuario?</label>
              {patients === null ? (
                <p className="text-xs text-slate-400">Cargando usuarios...</p>
              ) : (
                <select value={pickerPatient} onChange={(e) => { setPickerPatient(e.target.value); const p = patients.find((x) => String(x.id) === e.target.value); setPickerEmail(p?.guardianEmail || p?.email || ""); }} className={`${inputCls} bg-white`}>
                  <option value="">Elegir...</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>
            {picker.mode === "enviar" && (
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Correo de la familia</label>
                <input type="email" value={pickerEmail} onChange={(e) => setPickerEmail(e.target.value)} placeholder="Se toma de la ficha del usuario" className={inputCls} />
                <p className="text-[11px] text-slate-400 mt-1">La familia recibe un enlace, lee el documento y lo acepta. Queda registrado con su nombre, correo, fecha y hora.</p>
              </div>
            )}
            {pickerMsg && <p className={`text-sm ${pickerMsg.startsWith("Enviado") ? "text-emerald-700" : "text-rose-600"}`}>{pickerMsg}</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={!!editingConsent}
        onClose={() => setEditingConsent(null)}
        title="Editar documento"
        maxWidth="max-w-2xl"
        footer={
          <button onClick={guardarConsent} disabled={savingConsent} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 transition-all">
            {savingConsent ? "Guardando..." : "Guardar documento"}
          </button>
        }
      >
        {editingConsent && (
          <div className="space-y-4">
            {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-3 py-2.5">{error}</div>}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nombre *</label>
                <input type="text" value={editingConsent.name} onChange={(e) => setEditingConsent({ ...editingConsent, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tipo</label>
                <select value={editingConsent.kind} onChange={(e) => setEditingConsent({ ...editingConsent, kind: e.target.value })} className={`${inputCls} bg-white`}>
                  {Object.entries(CONSENT_KINDS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Texto</label>
              <textarea rows={16} value={editingConsent.body} onChange={(e) => setEditingConsent({ ...editingConsent, body: e.target.value })} className={`${inputCls} font-mono text-[13px] leading-relaxed`} />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Al enviarlo se reemplazan solos: <code>{"{{paciente}}"}</code>, <code>{"{{tutor}}"}</code>, <code>{"{{terapeuta}}"}</code>, <code>{"{{centro}}"}</code> y <code>{"{{fecha}}"}</code>.
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Editar plantilla"
        maxWidth="max-w-2xl"
        footer={
          <button onClick={guardar} disabled={saving} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/30">
            {saving ? "Guardando..." : "Guardar plantilla"}
          </button>
        }
      >
        {editing && (
          <div className="space-y-4">
            {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-3 py-2.5">{error}</div>}
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nombre *</label>
              <input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Para qué sirve</label>
              <input type="text" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Ej. Entrevista inicial con la familia" className={inputCls} />
            </div>

            {editing.sections.map((section, si) => (
              <div key={section.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
                <div className="flex items-center gap-2 mb-2">
                  <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => patch((s) => s.map((x, i) => i === si ? { ...x, title: e.target.value } : x))}
                    placeholder="Nombre de la sección"
                    className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                  <button onClick={() => moveSection(si, -1)} disabled={si === 0} className="text-xs text-slate-400 hover:text-violet-600 disabled:opacity-30 px-1">↑</button>
                  <button onClick={() => moveSection(si, 1)} disabled={si === editing.sections.length - 1} className="text-xs text-slate-400 hover:text-violet-600 disabled:opacity-30 px-1">↓</button>
                  <button onClick={() => removeSection(si)} className="text-slate-300 hover:text-rose-500"><X className="w-4 h-4" /></button>
                </div>

                <div className="space-y-2">
                  {section.fields.map((field, fi) => (
                    <div key={field.id} className="bg-white border border-slate-200 rounded-lg p-2.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => setField(si, fi, { label: e.target.value })}
                          placeholder="Pregunta o campo"
                          className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        />
                        <select
                          value={field.type}
                          onChange={(e) => setField(si, fi, { type: e.target.value as FieldType, options: needsOptions(e.target.value as FieldType) ? field.options ?? [] : undefined })}
                          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        >
                          {Object.entries(FIELD_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <button onClick={() => removeField(si, fi)} className="text-slate-300 hover:text-rose-500 shrink-0"><X className="w-4 h-4" /></button>
                      </div>
                      {needsOptions(field.type) && (
                        <input
                          type="text"
                          value={(field.options ?? []).join(", ")}
                          onChange={(e) => setField(si, fi, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                          placeholder="Opciones separadas por coma: Sí, A veces, No"
                          className="w-full mt-2 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        />
                      )}
                    </div>
                  ))}
                  <button onClick={() => addField(si)} className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700">
                    <Plus className="w-3 h-3" /> Agregar campo
                  </button>
                </div>
              </div>
            ))}

            <button onClick={addSection} className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-700">
              <Copy className="w-4 h-4" /> Agregar sección
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
