/** Formularios propios: estructura, tipos de campo y la plantilla tipo de TOdo */

export type FieldType =
  | "texto"
  | "texto_largo"
  | "numero"
  | "fecha"
  | "hora"
  | "si_no"
  | "opcion_unica"
  | "opcion_multiple";

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  /** Texto corto que acompaña al campo */
  hint?: string;
}

export interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  texto: "Texto corto",
  texto_largo: "Texto largo",
  numero: "Número",
  fecha: "Fecha",
  hora: "Hora",
  si_no: "Sí / No",
  opcion_unica: "Elegir una opción",
  opcion_multiple: "Elegir varias opciones",
};

export function needsOptions(type: FieldType): boolean {
  return type === "opcion_unica" || type === "opcion_multiple";
}

/** Valida y limpia lo que llega del editor antes de guardarlo */
export function sanitizeSections(input: unknown): FormSection[] {
  if (!Array.isArray(input)) return [];
  const types = Object.keys(FIELD_TYPE_LABELS) as FieldType[];
  return input.slice(0, 40).map((raw, si) => {
    const section = (raw ?? {}) as Record<string, unknown>;
    const fields = Array.isArray(section.fields) ? section.fields : [];
    return {
      id: String(section.id ?? `s${si + 1}`).slice(0, 40),
      title: String(section.title ?? "").slice(0, 120),
      fields: fields.slice(0, 60).map((rawField, fi) => {
        const f = (rawField ?? {}) as Record<string, unknown>;
        const type = types.includes(f.type as FieldType) ? (f.type as FieldType) : "texto";
        const options = Array.isArray(f.options)
          ? f.options.map((o) => String(o).slice(0, 80)).filter(Boolean).slice(0, 20)
          : [];
        return {
          id: String(f.id ?? `s${si + 1}f${fi + 1}`).slice(0, 40),
          label: String(f.label ?? "").slice(0, 200),
          type,
          ...(needsOptions(type) ? { options } : {}),
          ...(f.hint ? { hint: String(f.hint).slice(0, 200) } : {}),
        };
      }),
    };
  });
}

const s = (id: string, title: string, fields: FormField[]): FormSection => ({ id, title, fields });
const f = (id: string, label: string, type: FieldType, options?: string[], hint?: string): FormField => ({
  id,
  label,
  type,
  ...(options ? { options } : {}),
  ...(hint ? { hint } : {}),
});

/**
 * "Ficha de inicio – Terapia Ocupacional": la ficha real de una de las
 * terapeutas testers, lista para usar o editar. Los datos personales, los
 * datos familiares y el motivo de consulta no se repiten aquí porque ya se
 * piden al crear el usuario.
 */
export const FICHA_INICIO: { name: string; description: string; sections: FormSection[] } = {
  name: "Ficha de inicio — Terapia Ocupacional",
  description:
    "Entrevista inicial con la familia. Los datos personales, familiares y el motivo de consulta se toman de la ficha del usuario.",
  sections: [
    s("rutina", "Rutina diaria", [
      f("despierta", "Hora en que se despierta", "hora"),
      f("escuela", "Va a la escuela", "si_no"),
      f("siesta", "Siesta", "si_no"),
      f("dormir", "Hora de dormir", "hora"),
      f("dificiles", "Momentos que suelen ser difíciles", "opcion_multiple", ["Mañana", "Tarde", "Noche"]),
      f("tranquilo", "Momentos en que está más tranquilo/a", "texto_largo"),
    ]),
    s("pantallas", "Uso de pantallas", [
      f("usa", "¿Usa pantallas?", "si_no"),
      f("tiempo", "Tiempo aproximado por día", "opcion_unica", ["Menos de 1 hora", "1–2 horas", "Más de 2 horas"]),
      f("reaccion", "¿Cómo reacciona cuando se las sacan?", "opcion_multiple", ["Se enoja", "Llora", "Lo acepta", "Otro"]),
      f("reaccion_otro", "Otro (describir)", "texto"),
    ]),
    s("casa", "En casa", [
      f("limites", "Para poner límites generalmente", "opcion_unica", ["Obedece", "A veces cuesta", "Cuesta mucho"]),
      f("funciona", "¿Qué cosas funcionan bien en casa?", "texto_largo"),
      f("dificiles_casa", "¿Qué situaciones suelen ser difíciles?", "texto_largo"),
    ]),
    s("desarrollo", "Antecedentes del desarrollo", [
      f("embarazo", "Embarazo: controlado / complicaciones", "texto_largo"),
      f("parto_tipo", "Parto: tipo", "opcion_unica", ["Natural", "Cesárea"]),
      f("semanas", "Semanas de gestación", "numero"),
      f("peso", "Peso al nacer", "texto"),
      f("cefalico", "Sostén cefálico (edad)", "texto"),
      f("sento", "Se sentó (edad)", "texto"),
      f("gateo", "Gateó (edad)", "texto"),
      f("camino", "Caminó (edad)", "texto"),
      f("palabras", "Lenguaje: primeras palabras", "texto"),
      f("lenguaje_actual", "Lenguaje: actualmente", "texto_largo"),
    ]),
    s("salud", "Salud", [
      f("diagnostico", "¿Tiene algún diagnóstico?", "si_no"),
      f("diagnostico_cual", "¿Cuál?", "texto"),
      f("medicacion", "¿Toma medicación?", "si_no"),
      f("medicacion_cual", "¿Cuál?", "texto"),
      f("otros_prof", "¿Asiste a otros profesionales?", "si_no"),
      f("otros_prof_cuales", "¿Cuáles?", "texto_largo"),
    ]),
    s("avd", "Actividades diarias", [
      f("alimentacion", "Alimentación", "opcion_unica", ["Come de todo", "Selectivo", "Le cuesta"]),
      f("sueno", "Sueño", "opcion_unica", ["Duerme bien", "Le cuesta dormir", "Se despierta mucho"]),
      f("esfinteres", "Control de esfínteres", "opcion_unica", ["Sí", "En proceso", "No"]),
      f("vestido", "Vestido", "opcion_unica", ["Solo", "Con ayuda"]),
      f("higiene", "Higiene (baño, dientes)", "opcion_unica", ["Solo", "Con ayuda"]),
    ]),
    s("juego", "Juego", [
      f("gusta", "¿A qué le gusta jugar?", "texto_largo"),
      f("prefiere", "Prefiere", "opcion_unica", ["Jugar solo", "Con otros", "Ambos"]),
    ]),
    s("escuela_sec", "Escuela", [
      f("como_va", "¿Cómo le va en la escuela?", "opcion_unica", ["Bien", "Regular", "Le cuesta"]),
      f("otros_ninos", "¿Cómo es con otros niños?", "opcion_unica", ["Se relaciona bien", "Le cuesta", "Prefiere estar solo"]),
    ]),
    s("sensorial", "Sensorial", [
      f("ruidos", "Ruidos: ¿le molesta o los busca mucho?", "si_no"),
      f("texturas", "Texturas (ropa, comida)", "si_no"),
      f("movimiento", "Movimiento", "opcion_unica", ["Busca", "Evita", "No"]),
      f("comida_sensorial", "Comida", "opcion_unica", ["Selectivo", "No"]),
    ]),
    s("conducta", "Conducta", [
      f("frustra", "Cuando se frustra", "opcion_multiple", ["Llora", "Se enoja", "Se calma rápido", "Le cuesta calmarse"]),
      f("atencion", "Atención", "opcion_unica", ["Buena", "Variable", "Le cuesta"]),
    ]),
    s("autonomia", "Autonomía", [
      f("independencia", "Nivel de independencia en actividades diarias", "texto_largo"),
      f("ayuda", "Necesita ayuda en", "texto_largo"),
    ]),
    s("fortalezas", "Fortalezas del niño/a", [
      f("intereses", "Intereses", "texto"),
      f("habilidades", "Habilidades", "texto"),
      f("disfruta", "Lo que más disfruta", "texto"),
    ]),
    s("expectativas", "Expectativas de la familia", [
      f("lograr", "¿Qué les gustaría lograr con la terapia?", "texto_largo"),
      f("prioridades", "Prioridades actuales", "texto_largo"),
    ]),
  ],
};

/**
 * Convierte una plantilla en instrucciones para la IA, de modo que el
 * informe salga con la estructura, las secciones y el orden que definió
 * el Centro.
 */
export function templateToPrompt(name: string, sections: FormSection[]): string {
  const cuerpo = sections
    .map((sec) => {
      const campos = sec.fields.map((f) => `   - ${f.label}`).join("\n");
      return ` ${sec.title}\n${campos}`;
    })
    .join("\n");
  return `ESTRUCTURA OBLIGATORIA DEL INFORME (plantilla "${name}" del Centro).
Respeta estas secciones, en este orden, con estos títulos exactos. Bajo cada título desarrolla los puntos indicados en prosa clínica; si falta información para alguno, escríbelo como "Sin información registrada" en vez de inventarlo.

${cuerpo}`;
}
