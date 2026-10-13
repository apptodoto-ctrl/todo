"use client";

import type { FormSection } from "@/lib/formTemplates";

export type Answers = Record<string, string | string[] | boolean | null>;

const inputCls =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all";

/** Pinta una plantilla para llenarla, o solo para leerla */
export default function FormFiller({
  sections,
  answers,
  onChange,
  readOnly = false,
}: {
  sections: FormSection[];
  answers: Answers;
  onChange?: (fieldId: string, value: Answers[string]) => void;
  readOnly?: boolean;
}) {
  const set = (id: string, value: Answers[string]) => onChange?.(id, value);

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.id} className="break-inside-avoid">
          <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-1.5 mb-3">{section.title}</h4>
          <div className="space-y-3">
            {section.fields.map((field) => {
              const value = answers[field.id];
              const empty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

              if (readOnly) {
                return (
                  <div key={field.id} className="flex flex-wrap gap-x-2 text-sm">
                    <span className="font-semibold text-slate-600">{field.label}:</span>
                    <span className={empty ? "text-slate-300" : "text-slate-800"}>
                      {empty
                        ? "—"
                        : field.type === "si_no"
                          ? value === true ? "Sí" : "No"
                          : Array.isArray(value) ? value.join(", ") : String(value)}
                    </span>
                  </div>
                );
              }

              return (
                <div key={field.id}>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{field.label}</label>

                  {field.type === "texto_largo" ? (
                    <textarea rows={3} value={(value as string) ?? ""} onChange={(e) => set(field.id, e.target.value)} className={`${inputCls} resize-y`} />
                  ) : field.type === "si_no" ? (
                    <div className="flex gap-2">
                      {[{ v: true, l: "Sí" }, { v: false, l: "No" }].map((o) => (
                        <button
                          key={o.l}
                          type="button"
                          onClick={() => set(field.id, value === o.v ? null : o.v)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                            value === o.v ? "bg-violet-500 text-white border-violet-500" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                          }`}
                        >
                          {o.l}
                        </button>
                      ))}
                    </div>
                  ) : field.type === "opcion_unica" ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(field.options ?? []).map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => set(field.id, value === o ? null : o)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                            value === o ? "bg-violet-500 text-white border-violet-500 font-semibold" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  ) : field.type === "opcion_multiple" ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(field.options ?? []).map((o) => {
                        const list = Array.isArray(value) ? value : [];
                        const on = list.includes(o);
                        return (
                          <button
                            key={o}
                            type="button"
                            onClick={() => set(field.id, on ? list.filter((x) => x !== o) : [...list, o])}
                            className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                              on ? "bg-violet-500 text-white border-violet-500 font-semibold" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                            }`}
                          >
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type={field.type === "numero" ? "number" : field.type === "fecha" ? "date" : field.type === "hora" ? "time" : "text"}
                      value={(value as string) ?? ""}
                      onChange={(e) => set(field.id, e.target.value)}
                      className={inputCls}
                    />
                  )}

                  {field.hint && <p className="text-[11px] text-slate-400 mt-1">{field.hint}</p>}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
