"use client";

import { Clock, Target, Package, Lightbulb } from "lucide-react";
import type { ActivityGuide } from "@/lib/activityGuide";
import GuideIcon from "./GuideIcon";

const STEP_TONES = [
  "bg-violet-50 border-violet-200 text-violet-600",
  "bg-blue-50 border-blue-200 text-blue-600",
  "bg-emerald-50 border-emerald-200 text-emerald-600",
  "bg-amber-50 border-amber-200 text-amber-600",
  "bg-rose-50 border-rose-200 text-rose-600",
  "bg-cyan-50 border-cyan-200 text-cyan-600",
];

/** Hoja imprimible que la terapeuta entrega a la familia */
export default function VisualGuide({ guide, patientName }: { guide: ActivityGuide; patientName?: string }) {
  return (
    <div id="guia-visual" className="vg-root bg-white p-5">
      <header className="vg-head text-center border-b border-slate-200 pb-4 mb-5">
        <h2 className="vg-title text-xl font-bold text-slate-800">{guide.titulo}</h2>
        {patientName && <p className="vg-for text-sm text-slate-500 mt-0.5">Para {patientName}</p>}
        <div className="vg-meta flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
          {guide.objetivo && (
            <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-violet-500" /> {guide.objetivo}</span>
          )}
          {guide.duracion && (
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-violet-500" /> {guide.duracion}</span>
          )}
        </div>
      </header>

      {guide.materiales.length > 0 && (
        <section className="vg-materials mb-5">
          <h3 className="vg-h3 flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-2">
            <Package className="w-4 h-4 text-violet-500" /> Qué necesitas
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {guide.materiales.map((m, i) => (
              <span key={i} className="vg-chip text-xs text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">{m}</span>
            ))}
          </div>
        </section>
      )}

      <section className="vg-grid grid grid-cols-2 sm:grid-cols-3 gap-3">
        {guide.pasos.map((paso, i) => {
          const tone = STEP_TONES[i % STEP_TONES.length];
          return (
            <div key={paso.numero} className={`vg-step rounded-2xl border p-3 flex flex-col items-center text-center break-inside-avoid ${tone}`}>
              <span className="vg-num w-6 h-6 rounded-full bg-white/80 text-[11px] font-bold flex items-center justify-center mb-2 shadow-sm">
                {i + 1}
              </span>
              <GuideIcon name={paso.icono} className="w-10 h-10 mb-2" />
              {paso.titulo && <p className="vg-step-title text-xs font-bold text-slate-800 leading-tight">{paso.titulo}</p>}
              <p className="vg-step-text text-[11px] text-slate-600 leading-snug mt-1">{paso.texto}</p>
            </div>
          );
        })}
      </section>

      {guide.consejos.length > 0 && (
        <section className="vg-tips mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h3 className="vg-h3 flex items-center gap-1.5 text-sm font-bold text-amber-800 mb-2">
            <Lightbulb className="w-4 h-4" /> Consejos para la familia
          </h3>
          <ul className="space-y-1.5">
            {guide.consejos.map((c, i) => (
              <li key={i} className="text-xs text-amber-900 leading-snug flex gap-2">
                <span className="text-amber-500">•</span> {c}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
