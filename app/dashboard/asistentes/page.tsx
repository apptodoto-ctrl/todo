"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  FileText, BookOpen, Lightbulb, Sparkles,
  Loader2, ChevronRight, User, Download, Trash2
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useCurrentUser } from "@/lib/useCurrentUser";

interface SavedReport {
  id: number;
  patientId: number | null;
  patient?: { name: string } | null;
  type: string;
  title: string;
  content: string;
  createdAt: string;
}

interface Patient {
  id: number;
  name: string;
  age: number;
  diagnosis: string;
  therapist: string;
  sessions: number;
  nextSession: string;
  status: string;
  initials: string;
  color: string;
}

const assistants = [
  {
    id: "informe",
    title: "Asistente Informe Inicial",
    subtitle: "Redacción de Informes Iniciales",
    description: "Genera informes iniciales estructurados basados en la información del paciente y las mejores prácticas clínicas.",
    icon: FileText,
    gradient: "from-violet-500 to-purple-700",
    bgGlow: "bg-violet-500/10",
    tag: "INFORME INICIAL",
    prompt: "Ingresa el nombre del paciente, edad, diagnóstico y motivo de consulta para generar el informe inicial.",
    sampleOutput: `**INFORME INICIAL DE EVALUACIÓN TERAPÉUTICA**

**Datos del Paciente:** [Nombre], [Edad] años
**Diagnóstico Principal:** [Diagnóstico]
**Fecha de Evaluación:** ${new Date().toLocaleDateString("es-CL")}

**I. Motivo de Consulta**
El paciente es derivado por [especialidad] debido a [motivo], presentando dificultades en las áreas de desempeño ocupacional...

**II. Historia Ocupacional**
Se observa un patrón de desempeño [descripción], con impacto significativo en actividades de vida diaria...

**III. Evaluación de Funciones**
- Funciones Motoras: [descripción]
- Funciones Cognitivas: [descripción]
- Funciones Sensoriales: [descripción]

**IV. Objetivos Terapéuticos**
1. Mejorar [función específica] para facilitar [actividad]
2. Desarrollar [habilidad] mediante intervención [tipo]

**V. Plan de Intervención Propuesto**
Se propone intervención de terapia ocupacional con frecuencia [semanal/quincenal]...`,
  },
  {
    id: "cuentos",
    title: "Asistente Creadora de Cuentos",
    subtitle: "Creadora Cuentos para Exposición",
    description: "Crea cuentos terapéuticos personalizados para ayudar en el proceso de exposición y tratamiento.",
    icon: BookOpen,
    gradient: "from-blue-500 to-indigo-700",
    bgGlow: "bg-blue-500/10",
    tag: "CREADORA DE CUENTOS",
    prompt: "Describe el miedo o situación a trabajar, la edad del paciente y el contexto para crear el cuento personalizado.",
    sampleOutput: `**EL VALIENTE VIAJE DE LUNA** 🌙

Había una vez una niña llamada Luna que vivía en un hermoso pueblo entre montañas verdes...

Luna tenía un miedo muy grande: no le gustaba separarse de su mamá al llegar al colegio. Su corazón latía fuerte y sus manos se ponían frías...

Un día, Luna conoció a Pinto, un pequeño pájaro colorido que también había aprendido a volar lejos de su nido.

—¿Cómo lo hiciste? —preguntó Luna.

—Primero di un pequeño paso —dijo Pinto—. Luego otro. Y cada día el miedo se hacía más pequeñito...

**Actividad para casa:** Dibuja a Luna dando su primer paso valiente...`,
  },
  {
    id: "actividades",
    title: "Asistente Ideas para Actividades",
    subtitle: "Creadora Actividades Creativas",
    description: "Sugiere actividades creativas y terapéuticas adaptadas a las necesidades específicas de cada paciente.",
    icon: Lightbulb,
    gradient: "from-amber-500 to-orange-600",
    bgGlow: "bg-amber-500/10",
    tag: "IDEAS PARA ACTIVIDADES",
    prompt: "Especifica el diagnóstico, objetivos terapéuticos, edad y materiales disponibles para obtener ideas personalizadas.",
    sampleOutput: `**IDEAS DE ACTIVIDADES TERAPÉUTICAS**
**Para:** Desarrollo de Coordinación Motora Fina · 6 años

---
🎨 **1. Collage de Texturas**
*Objetivo:* Estimulación sensorial y pinza fina
*Materiales:* Telas, papel, pegamento, tijeras
*Duración:* 20-25 min
*Instrucciones:* Cortar y pegar diferentes texturas siguiendo un patrón...

✂️ **2. Origami Simple: El Perrito**
*Objetivo:* Secuencia motora y atención sostenida
*Materiales:* Hojas de colores
*Duración:* 15-20 min

🧵 **3. Ensartado de Cuentas**
*Objetivo:* Pinza fina y coordinación ojo-mano
*Nivel:* Progresivo (cuentas grandes → pequeñas)

🎯 **4. Laberinto con Plastilina**
*Objetivo:* Control motor y planificación
*Variante:* Usar pelota pequeña para recorrer el laberinto...`,
  },
];

export default function AsistentesPage() {
  const [activeAssistant, setActiveAssistant] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number | "">("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [savedReportId, setSavedReportId] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [viewingReport, setViewingReport] = useState<SavedReport | null>(null);
  const [specialty, setSpecialty] = useState("Terapeuta Ocupacional");
  const [credits, setCredits] = useState<{ totalRemaining: number; includedTotal: number; purchased: number } | null>(null);
  const { name: currentUserName } = useCurrentUser();

  const loadCredits = () => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d) => { if (d?.credits) setCredits(d.credits); })
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then((data) => setPatients(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch("/api/reports")
      .then((r) => r.json())
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((u) => { if (u?.specialty) setSpecialty(u.specialty); })
      .catch(() => {});
    loadCredits();
  }, []);

  const current = assistants.find((a) => a.id === activeAssistant);

  const systemPrompts: Record<string, string> = {
    informe: "Eres un asistente experto en terapia ocupacional. Genera informes iniciales estructurados, profesionales y completos en español, siguiendo estándares clínicos.",
    cuentos: "Eres un especialista en terapia narrativa y terapia ocupacional. Crea cuentos terapéuticos personalizados, creativos y apropiados para la edad del paciente, en español.",
    actividades: "Eres un terapeuta ocupacional experto en diseño de actividades terapéuticas. Propone actividades detalladas, creativas y adaptadas a las necesidades específicas del paciente, en español.",
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setOutput(null);
    setSavedReportId(null);
    setSaveState("idle");

    const patient = patients.find((p) => p.id === selectedPatientId);
    let patientContext = patient
      ? `DATOS DEL PACIENTE SELECCIONADO:\n- Nombre: ${patient.name}\n- Edad: ${patient.age} años\n- Diagnóstico: ${patient.diagnosis}\n- Terapeuta: ${currentUserName}\n- Sesiones realizadas: ${patient.sessions}\n- Próxima sesión: ${patient.nextSession}\n- Estado: ${patient.status}\n\n`
      : "";

    if (patient) {
      try {
        const recRes = await fetch(`/api/patients/${patient.id}/sessions`);
        const records: { date: string; notes: string; therapist: string }[] = await recRes.json();
        if (Array.isArray(records) && records.length > 0) {
          const history = records
            .slice(0, 15)
            .map((r) => `- ${r.date}${r.therapist ? ` (${r.therapist})` : ""}: ${r.notes || "Sin notas"}`)
            .join("\n");
          patientContext += `HISTORIAL DE SESIONES (más reciente primero):\n${history}\n\n`;
        }
      } catch { /* historial opcional */ }
    }

    const fullPrompt = patientContext + input;

    try {
      const featureKeys: Record<string, string> = {
        informe: "ai_informe",
        cuentos: "ai_cuento",
        actividades: "ai_ideas_actividades",
      };
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureKey: featureKeys[current?.id ?? ""] ?? "ai_ideas_actividades",
          prompt: fullPrompt,
          systemPrompt: current
            ? systemPrompts[current.id] +
              "\n\nIMPORTANTE: Responde en texto plano, sin markdown, sin asteriscos, sin almohadillas (#), sin viñetas especiales, sin emojis ni caracteres especiales de formato. Usa solo texto limpio con saltos de línea normales."
            : "Responde en texto plano, sin markdown, sin asteriscos, sin almohadillas (#), sin viñetas especiales, sin emojis ni caracteres especiales de formato.",
        }),
      });
      const data = await res.json();
      if (data.error) {
        setOutput(data.error);
        setLoading(false);
        loadCredits();
        return;
      }
      loadCredits();
      // Strip any remaining markdown/special chars just in case
      const clean = (data.text as string)
        .replace(/#{1,6}\s*/g, "")
        .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
        .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
        .replace(/`{1,3}[^`]*`{1,3}/g, "")
        .replace(/^\s*[-•·▪▸►]\s+/gm, "- ")
        .replace(/[^\S\n]+$/gm, "")
        .trim();
      setOutput(clean);
      // Guardar automáticamente en el historial de informes
      try {
        setSaveState("saving");
        const saveRes = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: patient?.id ?? null,
            type: current?.id ?? "informe",
            title: `${current?.title ?? "Documento"}${patient ? ` — ${patient.name}` : ""} · ${new Date().toLocaleDateString("es-CL")}`,
            content: clean,
          }),
        });
        if (saveRes.ok) {
          const saved: SavedReport = await saveRes.json();
          setSavedReportId(saved.id);
          setReports((prev) => [saved, ...prev]);
          setSaveState("saved");
        } else {
          setSaveState("idle");
        }
      } catch { setSaveState("idle"); }
    } catch (err) {
      setOutput("Error al conectar con la IA. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const saveOutputEdits = async () => {
    if (!savedReportId || !output) return;
    setSaveState("saving");
    const res = await fetch(`/api/reports/${savedReportId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: output }),
    });
    if (res.ok) {
      setReports((prev) => prev.map((r) => (r.id === savedReportId ? { ...r, content: output } : r)));
      setSaveState("saved");
    } else {
      setSaveState("idle");
    }
  };

  const deleteReport = async (id: number) => {
    if (!confirm("¿Eliminar este informe del historial?")) return;
    const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (viewingReport?.id === id) setViewingReport(null);
    }
  };

  // Impresión con membrete vía iframe oculto (evita bloqueadores de pop-ups)
  const printDocument = (docTitle: string, content: string, patientLine: string) => {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 780px; margin: 40px auto; padding: 0 24px; color: #1e293b; line-height: 1.7; }
    .letterhead { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #7c3aed; padding-bottom: 14px; margin-bottom: 6px; }
    .brand { font-size: 22px; font-weight: bold; color: #7c3aed; }
    .therapist { text-align: right; font-size: 12px; color: #475569; line-height: 1.5; }
    .therapist strong { font-size: 13px; color: #1e293b; }
    h1 { font-size: 17px; color: #1e293b; margin: 18px 0 4px; }
    .meta { font-size: 12px; color: #64748b; margin-bottom: 24px; }
    pre { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 13px; }
    .signature { margin-top: 60px; padding-top: 8px; border-top: 1px solid #94a3b8; width: 260px; font-size: 12px; color: #475569; text-align: center; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <div class="letterhead">
    <div class="brand">TOdo Therapy</div>
    <div class="therapist"><strong>${currentUserName}</strong><br/>${specialty}</div>
  </div>
  <h1>${docTitle}</h1>
  <div class="meta">${patientLine}${patientLine ? " &nbsp;·&nbsp; " : ""}Generado el ${new Date().toLocaleDateString("es-CL")}</div>
  <pre>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
  <div class="signature">${currentUserName}<br/>${specialty}</div>
</body>
</html>`;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 300);
  };

  const downloadPDF = () => {
    if (!output || !current) return;
    const patient = patients.find((p) => p.id === selectedPatientId);
    const patientLine = patient
      ? `Paciente: ${patient.name} &nbsp;·&nbsp; Diagnóstico: ${patient.diagnosis} &nbsp;·&nbsp; ${patient.age} años`
      : "";
    printDocument(current.title, output, patientLine);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Intro */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white/70 uppercase tracking-wider">Inteligencia Artificial</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">Asistentes Virtuales de IA</h2>
          <p className="text-white/70 max-w-xl">
            Herramientas de inteligencia artificial diseñadas para potenciar tu práctica clínica. Genera documentos, cuentos y actividades en segundos.
          </p>
          {credits && (
            <div className="mt-5 max-w-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">Créditos disponibles</span>
                <span className="text-sm font-bold text-white">{credits.totalRemaining}</span>
              </div>
              <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/80 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round((credits.totalRemaining / Math.max(1, credits.includedTotal + credits.purchased)) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {assistants.map((ast, i) => (
          <motion.div
            key={ast.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl border border-slate-200/60 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-300 overflow-hidden group cursor-pointer"
            onClick={() => {
              setActiveAssistant(ast.id);
              setOutput(null);
              setInput("");
              setSelectedPatientId("");
              setSavedReportId(null);
              setSaveState("idle");
            }}
          >
            <div className={`h-32 bg-gradient-to-br ${ast.gradient} relative overflow-hidden`}>
              <div className="absolute inset-0 bg-black/10" />
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
              <div className="absolute top-4 left-4">
                <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">{ast.tag}</span>
              </div>
              <div className="absolute bottom-4 left-4">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <ast.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-slate-800 mb-1 group-hover:text-violet-700 transition-colors">
                {ast.title}
              </h3>
              <p className="text-xs text-slate-400 mb-4 line-clamp-2">{ast.description}</p>
              <button className="flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                Usar Asistente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Informes guardados */}
      {reports.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-slate-200/60 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-violet-500" />
            <h3 className="font-semibold text-slate-800">Informes guardados</h3>
            <span className="text-xs text-slate-400">({reports.length})</span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 bg-slate-50 hover:bg-violet-50/60 rounded-xl px-4 py-3 transition-colors group">
                <button onClick={() => setViewingReport(r)} className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-violet-700 transition-colors">{r.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {r.patient?.name ? `${r.patient.name} · ` : ""}{new Date(r.createdAt).toLocaleDateString("es-CL")}
                  </p>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => printDocument(r.title, r.content, r.patient?.name ? `Paciente: ${r.patient.name}` : "")}
                    className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-100 rounded-lg transition-colors"
                    title="Imprimir / PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteReport(r.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Ver informe guardado */}
      <Modal
        open={!!viewingReport}
        onClose={() => setViewingReport(null)}
        title={viewingReport?.title ?? ""}
        maxWidth="max-w-2xl"
        footer={
          viewingReport ? (
            <button
              onClick={() => printDocument(viewingReport.title, viewingReport.content, viewingReport.patient?.name ? `Paciente: ${viewingReport.patient.name}` : "")}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/30"
            >
              <Download className="w-4 h-4" /> Imprimir / PDF
            </button>
          ) : undefined
        }
      >
        {viewingReport && (
          <div className="max-h-96 overflow-y-auto">
            <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">{viewingReport.content}</pre>
          </div>
        )}
      </Modal>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl border border-slate-200/60 p-6"
      >
        <h3 className="font-semibold text-slate-800 mb-5">¿Cómo funcionan los Asistentes Virtuales?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {assistants.map((ast) => (
            <div key={ast.id} className="flex gap-4">
              <div className={`w-10 h-10 bg-gradient-to-br ${ast.gradient} rounded-xl flex items-center justify-center shrink-0 shadow-md`}>
                <ast.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-1">
                  {ast.title.replace("Asistente ", "")}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">{ast.description}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Assistant Modal */}
      <Modal
        open={!!activeAssistant && !!current}
        onClose={() => setActiveAssistant(null)}
        title={current?.title ?? ""}
        subtitle={current?.tag}
        maxWidth="max-w-2xl"
        footer={
          <button
            onClick={handleGenerate}
            disabled={loading || !input.trim()}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/30"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando con IA...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generar con IA
              </>
            )}
          </button>
        }
      >
        {current && (
          <div className="space-y-4">
            {/* Patient selector */}
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-violet-500" /> Usuario
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
              >
                <option value="">Seleccionar usuario (opcional)</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.diagnosis} · {p.age} años
                  </option>
                ))}
              </select>
              {selectedPatientId !== "" && (() => {
                const p = patients.find((x) => x.id === selectedPatientId);
                return p ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { label: "Diagnóstico", value: p.diagnosis },
                      { label: "Sesiones", value: `${p.sessions}` },
                      { label: "Estado", value: p.status },
                    ].map(({ label, value }) => (
                      <span key={label} className="text-[11px] bg-violet-50 text-violet-700 border border-violet-100 rounded-lg px-2 py-0.5 font-medium">
                        {label}: {value}
                      </span>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Información adicional</label>
              <p className="text-xs text-slate-400 mb-3">{current.prompt}</p>
              <textarea
                rows={4}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Agrega detalles específicos, motivo de consulta, observaciones..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none transition-all placeholder-slate-400"
              />
            </div>
            {output && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Resultado {saveState === "saved" ? "· guardado ✓" : saveState === "saving" ? "· guardando..." : "· editado (sin guardar)"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {savedReportId && saveState === "idle" && (
                      <button
                        onClick={saveOutputEdits}
                        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Guardar cambios
                      </button>
                    )}
                    <button
                      onClick={downloadPDF}
                      className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Imprimir / PDF
                    </button>
                  </div>
                </div>
                <textarea
                  value={output}
                  onChange={(e) => { setOutput(e.target.value); setSaveState("idle"); }}
                  rows={12}
                  className="w-full p-4 text-sm text-slate-700 leading-relaxed font-sans resize-y focus:outline-none"
                />
                <p className="px-4 pb-3 text-[11px] text-slate-400">Puedes editar el texto antes de imprimir. Los cambios se guardan en el historial con &quot;Guardar cambios&quot;.</p>
              </motion.div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
