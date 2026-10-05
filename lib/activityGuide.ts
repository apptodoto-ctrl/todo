/**
 * Guía visual de actividades (IA2): la IA estructura la actividad en pasos y
 * elige para cada uno un icono de este catálogo, para que la familia pueda
 * seguirla mirando en vez de leyendo.
 */

export const GUIDE_ICONS = [
  "mano", "pinza", "tijeras", "pegamento", "pincel", "lapiz", "papel", "libro",
  "pelota", "bloques", "puzzle", "cubo", "musica", "baile", "correr", "saltar",
  "equilibrio", "estirar", "respirar", "calma", "mirar", "escuchar", "hablar",
  "tocar", "oler", "gustar", "agua", "arena", "plastilina", "cocina", "comer",
  "vestirse", "zapatos", "dientes", "bano", "dormir", "casa", "silla", "mesa",
  "reloj", "turno", "ayuda", "celebrar", "estrella", "corazon", "sol", "foto",
] as const;

export type GuideIcon = (typeof GUIDE_ICONS)[number];

export interface GuideStep {
  numero: number;
  titulo: string;
  texto: string;
  icono: GuideIcon;
}

export interface ActivityGuide {
  titulo: string;
  objetivo: string;
  duracion: string;
  materiales: string[];
  pasos: GuideStep[];
  consejos: string[];
}

export const GUIDE_SYSTEM_PROMPT = `Eres un terapeuta ocupacional que prepara guías visuales para que las familias repitan una actividad en casa.

Respondes SOLO con un objeto JSON válido, sin texto antes ni después y sin bloques de código. La estructura exacta es:
{
  "titulo": "nombre corto de la actividad",
  "objetivo": "qué trabaja, en una frase simple para la familia",
  "duracion": "ej. 15-20 minutos",
  "materiales": ["material 1", "material 2"],
  "pasos": [{ "numero": 1, "titulo": "dos o tres palabras", "texto": "una frase corta y concreta dirigida a la familia", "icono": "uno del catálogo" }],
  "consejos": ["recomendación breve para la familia"]
}

Reglas:
- Entre 4 y 8 pasos. Cada "texto" con menos de 140 caracteres, en lenguaje cotidiano, tratando de tú a la familia.
- "icono" debe ser EXACTAMENTE uno de este catálogo: ${GUIDE_ICONS.join(", ")}. Elige el que mejor represente el paso.
- Entre 2 y 4 consejos.
- Escribe en español latinoamericano neutro (Chile, Argentina y Colombia): trata de "ustedes", nunca uses "vosotros" ni modismos de España.\n- Escribe en español correcto con tildes (á, é, í, ó, ú), ñ y signos de apertura (¿, ¡). Sin markdown ni emojis.`;

/** Extrae y valida el JSON que devuelve la IA; null si no se puede usar */
export function parseActivityGuide(raw: string): ActivityGuide | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  let data: unknown;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const g = data as Record<string, unknown>;
  if (!Array.isArray(g.pasos) || g.pasos.length === 0) return null;

  const allowed = new Set<string>(GUIDE_ICONS);
  const pasos: GuideStep[] = g.pasos
    .map((p, i) => {
      const step = p as Record<string, unknown>;
      const icono = String(step.icono ?? "").trim();
      return {
        numero: Number(step.numero) || i + 1,
        titulo: String(step.titulo ?? "").trim(),
        texto: String(step.texto ?? "").trim(),
        icono: (allowed.has(icono) ? icono : "estrella") as GuideIcon,
      };
    })
    .filter((p) => p.texto.length > 0);

  if (pasos.length === 0) return null;

  const strings = (value: unknown): string[] =>
    Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : [];

  return {
    titulo: String(g.titulo ?? "Actividad").trim() || "Actividad",
    objetivo: String(g.objetivo ?? "").trim(),
    duracion: String(g.duracion ?? "").trim(),
    materiales: strings(g.materiales),
    pasos,
    consejos: strings(g.consejos),
  };
}
