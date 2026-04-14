"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  FileText, BookOpen, Lightbulb, Sparkles,
  Loader2, ChevronRight, User, Download
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { initialPatients } from "@/lib/patientsData";

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

    const patient = initialPatients.find((p) => p.id === selectedPatientId);
    const patientContext = patient
      ? `DATOS DEL PACIENTE SELECCIONADO:\n- Nombre: ${patient.name}\n- Edad: ${patient.age} años\n- Diagnóstico: ${patient.diagnosis}\n- Terapeuta: ${patient.therapist}\n- Sesiones realizadas: ${patient.sessions}\n- Próxima sesión: ${patient.nextSession}\n- Estado: ${patient.status}\n\n`
      : "";

    const fullPrompt = patientContext + input;

    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPrompt,
          systemPrompt: current ? systemPrompts[current.id] : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOutput(data.text);
    } catch (err) {
      setOutput("❌ Error al conectar con la IA. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!output || !current) return;
    const patient = initialPatients.find((p) => p.id === selectedPatientId);
    const patientLine = patient
      ? `Paciente: ${patient.name} &nbsp;·&nbsp; Diagnóstico: ${patient.diagnosis} &nbsp;·&nbsp; ${patient.age} años`
      : "";
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${current.title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 780px; margin: 40px auto; padding: 0 24px; color: #1e293b; line-height: 1.7; }
    h1 { font-size: 20px; color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; margin-bottom: 4px; }
    .meta { font-size: 12px; color: #64748b; margin-bottom: 28px; }
    pre { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 13px; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>${current.title}</h1>
  <div class="meta">${patientLine}${patientLine ? " &nbsp;·&nbsp; " : ""}Generado el ${new Date().toLocaleDateString("es-CL")}</div>
  <pre>${output.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body>
</html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 300);
    }
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
                <User className="w-3.5 h-3.5 text-violet-500" /> Paciente
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
              >
                <option value="">Seleccionar paciente (opcional)</option>
                {initialPatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.diagnosis} · {p.age} años
                  </option>
                ))}
              </select>
              {selectedPatientId !== "" && (() => {
                const p = initialPatients.find((x) => x.id === selectedPatientId);
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
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resultado</span>
                  <button
                    onClick={downloadPDF}
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar PDF
                  </button>
                </div>
                <div className="p-4 max-h-72 overflow-y-auto">
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">{output}</pre>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
