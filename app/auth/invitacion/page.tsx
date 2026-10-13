"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Brain, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";

function Invitacion() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [info, setInfo] = useState<{ email: string; name: string; centerName: string; hasAccount: boolean } | null>(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(!!token);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/center/invite?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) setError(d.error ?? "Esta invitación ya no está disponible.");
        else setInfo(d);
      })
      .catch(() => setError("No se pudo cargar la invitación."))
      .finally(() => setLoading(false));
  }, [token]);

  const aceptar = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/center/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "No se pudo aceptar la invitación."); setSaving(false); return; }

    if (info?.hasAccount) {
      router.push("/auth");
      return;
    }
    const entrada = await signIn("credentials", { email: data.email, password, redirect: false });
    setSaving(false);
    if (entrada?.error) router.push("/auth");
    else router.push("/dashboard/inicio");
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">TOdo Therapy</span>
        </div>

        <div className="bg-white/[0.04] backdrop-blur border border-white/[0.08] rounded-2xl p-6">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
          ) : !token ? (
            <p className="text-center text-rose-300 text-sm py-6">Falta el enlace de la invitación.</p>
          ) : error && !info ? (
            <p className="text-center text-rose-300 text-sm py-6">{error}</p>
          ) : info ? (
            <>
              <h1 className="text-lg font-bold text-white text-center">{info.centerName} te invitó a su equipo</h1>
              <p className="text-sm text-white/50 text-center mt-1.5 mb-6">
                Entrarás con tu propio acceso: <strong className="text-white/80">{info.email}</strong>
              </p>

              {info.hasAccount ? (
                <p className="text-sm text-white/60 bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 mb-4">
                  Ya tienes una cuenta en TOdo con este correo. Al aceptar, entrarás al Centro con la contraseña que ya usas.
                </p>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white/70 mb-2">Crea tu contraseña</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Al menos 6 caracteres"
                      className="w-full bg-white/[0.07] border border-white/[0.12] rounded-xl px-4 py-3 pr-11 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all text-sm"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-rose-300 mb-3">{error}</p>}

              <button
                onClick={aceptar}
                disabled={saving || (!info.hasAccount && password.length < 6)}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</> : <><CheckCircle2 className="w-4 h-4" /> Aceptar invitación</>}
              </button>

              <p className="text-[11px] text-white/35 text-center mt-4">
                Tu trabajo en el Centro queda guardado en el Centro. Si además atiendes por tu cuenta, esa consulta va en una cuenta aparte.
              </p>
            </>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-slate-900" />}>
      <Invitacion />
    </Suspense>
  );
}
