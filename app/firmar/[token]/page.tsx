"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Brain, Loader2, CheckCircle2, FileText } from "lucide-react";

interface Doc {
  title: string; body: string; patientName: string; from: string; sentTo: string;
  accepted: boolean; acceptedAt: string | null; acceptedName: string;
}

export default function FirmarPage() {
  const { token } = useParams<{ token: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [read, setRead] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/firmar/${token}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) { setError(d.error ?? "Este enlace no es válido."); return; }
        setDoc(d);
        setEmail(d.sentTo ?? "");
        if (d.accepted) setDone(d.acceptedAt);
      })
      .catch(() => setError("No se pudo cargar el documento."))
      .finally(() => setLoading(false));
  }, [token]);

  const aceptar = async () => {
    setSaving(true); setError("");
    const res = await fetch(`/api/firmar/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, accept: read }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setError(d.error ?? "No se pudo registrar."); return; }
    setDone(d.acceptedAt);
  };

  return (
    <div className="min-h-dvh bg-slate-50 py-8 px-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-800">TOdo Therapy</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
        ) : !doc ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-rose-600 text-sm">{error}</div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
              <div className="flex items-start gap-3 mb-5">
                <FileText className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                <div>
                  <h1 className="text-xl font-bold text-slate-800">{doc.title}</h1>
                  <p className="text-sm text-slate-500 mt-0.5">{doc.from} · sobre {doc.patientName}</p>
                </div>
              </div>
              <div className="prose prose-slate max-w-none text-[15px] leading-relaxed text-slate-700 whitespace-pre-wrap border-t border-slate-100 pt-5">
                {doc.body}
              </div>
            </div>

            {done ? (
              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-900">Documento aceptado</p>
                  <p className="text-sm text-emerald-800 mt-0.5">
                    Quedó registrado el {new Date(done).toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" })}
                    {doc.acceptedName ? ` por ${doc.acceptedName}` : ""}. Tu terapeuta ya lo tiene guardado. Puedes cerrar esta página.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-6">
                <p className="text-sm font-bold text-slate-800 mb-3">Para aceptar</p>
                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Tu nombre completo</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Tu correo</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400" />
                  </div>
                </div>
                <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer mb-4">
                  <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} className="mt-0.5 w-4 h-4 accent-violet-600" />
                  <span>Leí el documento completo y acepto lo que dice.</span>
                </label>
                {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
                <button
                  onClick={aceptar}
                  disabled={saving || !read || !name.trim() || !email.trim()}
                  className="w-full sm:w-auto bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold px-6 py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</> : <><CheckCircle2 className="w-4 h-4" /> Acepto</>}
                </button>
                <p className="text-[11px] text-slate-400 mt-3">Al aceptar quedan registrados tu nombre, tu correo y la fecha y hora. Si tienes dudas, habla con tu terapeuta antes.</p>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
