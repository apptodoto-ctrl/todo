"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Bot, FileText, BookOpen, Lightbulb, Sparkles, ArrowRight,
  Send, X, Loader2, ChevronRight, Star
} from "lucide-react";

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
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input,
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

      {/* Modal */}
      <AnimatePresence>
        {activeAssistant && current && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setActiveAssistant(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className={`bg-gradient-to-r ${current.gradient} p-6 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <current.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{current.tag}</p>
                      <h3 className="font-bold">{current.title}</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveAssistant(null)}
                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Prompt area */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">
                    Información del paciente
                  </label>
                  <p className="text-xs text-slate-400 mb-3">{current.prompt}</p>
                  <textarea
                    rows={4}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe aquí los datos del paciente..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none transition-all placeholder-slate-400"
                  />
                </div>

                {/* Output */}
                {output && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-violet-500" />
                      <span className="text-sm font-semibold text-violet-700">Resultado generado</span>
                    </div>
                    <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">
                      {output}
                    </pre>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 p-4">
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
