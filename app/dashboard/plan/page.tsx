"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Crown, Sparkles, Zap, Loader2, Check, CreditCard, Clock } from "lucide-react";

interface Tier {
  id: number; code: string; plan: string; maxPatients: number | null; therapists: number;
  aiCredits: number; priceMonthly: number; priceYearly: number; notes: string;
}
interface Pack { id: number; code: string; credits: number; price: number; }
interface Feature { key: string; name: string; creditCost: number; esencial: boolean; profesional: boolean; centro: boolean; }
interface BillingInfo {
  plan: string; tierCode: string; status: string; billingCycle: string;
  trialEndsAt: string | null; currentPeriodEnd: string | null;
  credits: { includedTotal: number; includedRemaining: number; purchased: number; totalRemaining: number; warningPct: number };
  maxPatients: number | null; stripeEnabled: boolean; hasStripeSubscription: boolean;
  tiers: Tier[]; packs: Pack[]; features: Feature[];
}

export default function PlanPage() {
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setInfo(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const go = async (endpoint: string, body: Record<string, unknown>, key: string) => {
    setBusy(key);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo procesar");
        setTimeout(() => setError(""), 5000);
      } else if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      setError("Error de conexión");
      setTimeout(() => setError(""), 5000);
    }
    setBusy("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 animate-pulse" />
      </div>
    );
  }
  if (!info) return <p className="text-center text-slate-400 py-20">No se pudo cargar la información del plan</p>;

  const { credits } = info;
  const pctUsed = Math.round(((credits.includedTotal + credits.purchased - credits.totalRemaining) / Math.max(1, credits.includedTotal + credits.purchased)) * 100);
  const isTrial = info.status === "trialing";
  const isExpired = info.status === "expired";
  const currentPlanLower = info.tiers.find((t) => t.code === info.tierCode)?.plan?.toLowerCase() ?? (isTrial ? "profesional" : "");
  const canBuyCredits = !isTrial && !isExpired && ["profesional", "centro"].includes(currentPlanLower);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      {error && (
        <div className="fixed top-6 right-6 z-50 bg-rose-500 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl max-w-sm">{error}</div>
      )}

      {/* Estado actual */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-700 rounded-3xl p-7 text-white relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-white/70" />
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Tu plan actual</span>
            </div>
            <h1 className="text-2xl font-bold">{info.plan}</h1>
            <p className="text-white/60 text-sm mt-1">
              {isTrial && info.trialEndsAt && `Prueba gratis hasta el ${new Date(info.trialEndsAt).toLocaleDateString("es-CL")} · IA completa · hasta ${info.maxPatients} pacientes`}
              {isExpired && "Tu acceso está en solo lectura. Tus datos siguen intactos — elige un plan para continuar."}
              {info.status === "active" && `${info.maxPatients ? `Hasta ${info.maxPatients} pacientes` : "Pacientes sin tope"} · ciclo ${info.billingCycle === "yearly" ? "anual" : "mensual"}${info.currentPeriodEnd ? ` · renueva el ${new Date(info.currentPeriodEnd).toLocaleDateString("es-CL")}` : ""}`}
              {info.status === "past_due" && "Hay un problema con tu último pago — tu acceso sigue normal mientras se reintenta. Revisa tu tarjeta en «Gestionar pago»."}
            </p>
          </div>
          <div className="w-full md:w-64">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">Créditos de IA</span>
              <span className="text-lg font-bold">{credits.totalRemaining}</span>
            </div>
            <div className="h-2.5 bg-white/15 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${pctUsed >= credits.warningPct ? "bg-amber-300" : "bg-white/80"}`} style={{ width: `${Math.min(100, 100 - pctUsed)}%` }} />
            </div>
            <p className="text-[11px] text-white/50 mt-1.5">
              {credits.includedRemaining} del plan{credits.purchased > 0 ? ` + ${credits.purchased} comprados` : ""}
              {pctUsed >= credits.warningPct && " · quedan pocos créditos este ciclo"}
            </p>
          </div>
          {info.hasStripeSubscription && (
            <button onClick={() => go("/api/billing/portal", {}, "portal")} disabled={busy === "portal"} className="shrink-0 flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all">
              {busy === "portal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />} Gestionar pago
            </button>
          )}
        </div>
      </motion.div>

      {/* Selector ciclo */}
      <div className="flex items-center justify-center gap-2">
        <button onClick={() => setCycle("monthly")} className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${cycle === "monthly" ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md" : "bg-white border border-slate-200 text-slate-500"}`}>Mensual</button>
        <button onClick={() => setCycle("yearly")} className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${cycle === "yearly" ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md" : "bg-white border border-slate-200 text-slate-500"}`}>
          Anual <span className={cycle === "yearly" ? "text-white/80" : "text-emerald-600"}>· 2 meses gratis</span>
        </button>
      </div>

      {/* Planes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {info.tiers.map((t, i) => {
          const isCurrent = !isTrial && !isExpired && t.code === info.tierCode;
          const price = cycle === "yearly" ? t.priceYearly : t.priceMonthly;
          const featuresForPlan = info.features.filter((f) => {
            const p = t.plan.toLowerCase();
            return p === "esencial" ? f.esencial : p === "profesional" ? f.profesional : f.centro;
          });
          return (
            <motion.div key={t.code} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`bg-white rounded-2xl border p-5 flex flex-col ${isCurrent ? "border-violet-400 ring-2 ring-violet-200" : "border-slate-200/60 hover:border-violet-200"} transition-all`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-violet-500 uppercase tracking-wide">{t.plan}</span>
                {isCurrent && <span className="text-[10px] font-bold bg-violet-100 text-violet-600 px-2 py-0.5 rounded-lg">Tu plan</span>}
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-slate-800">${price}</span>
                <span className="text-sm text-slate-400">/{cycle === "yearly" ? "año" : "mes"}</span>
              </div>
              <p className="text-xs text-slate-400 mb-4 font-mono">{t.code}</p>
              <ul className="space-y-2 text-sm text-slate-600 flex-1">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {t.maxPatients ? `Hasta ${t.maxPatients} pacientes` : "Pacientes sin tope"}</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {t.therapists > 1 ? `${t.therapists} terapeutas` : "1 terapeuta"}</li>
                <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0" /> {t.aiCredits} créditos de IA/mes{t.notes.toLowerCase().includes("compartidos") ? " compartidos" : ""}</li>
                {featuresForPlan.map((f) => (
                  <li key={f.key} className="flex items-center gap-2 text-xs text-slate-500"><Check className="w-3 h-3 text-emerald-400 shrink-0" /> {f.name}</li>
                ))}
              </ul>
              <button
                onClick={() => go("/api/billing/checkout", { tierCode: t.code, cycle }, `tier-${t.code}`)}
                disabled={isCurrent || busy === `tier-${t.code}`}
                className={`mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${isCurrent ? "bg-slate-100 text-slate-400 cursor-default" : "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-400 hover:to-purple-500 shadow-md shadow-violet-500/25"}`}
              >
                {busy === `tier-${t.code}` ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isCurrent ? "Plan actual" : "Elegir este plan"}
              </button>
            </motion.div>
          );
        })}
      </div>
      <p className="text-center text-xs text-slate-400">¿Tienes un cupón? Podrás ingresarlo en la pantalla de pago.</p>

      {/* Recargas */}
      {canBuyCredits && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200/60 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-violet-500" />
            <h2 className="font-semibold text-slate-800">Recargas de créditos</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">Los créditos comprados se acumulan, no vencen con el ciclo, y se usan cuando se acaban los del plan.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {info.packs.map((p) => (
              <button key={p.code} onClick={() => go("/api/billing/buy-credits", { packCode: p.code }, `pack-${p.code}`)} disabled={busy === `pack-${p.code}`}
                className="border border-slate-200 hover:border-violet-300 rounded-xl p-4 text-center transition-all group">
                <p className="text-2xl font-bold text-slate-800 group-hover:text-violet-700">{p.credits}</p>
                <p className="text-xs text-slate-400">créditos</p>
                <p className="mt-2 text-sm font-semibold text-violet-600">{busy === `pack-${p.code}` ? "..." : `$${p.price}`}</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {isTrial && (
        <div className="flex items-center gap-2 justify-center text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5" /> Al terminar la prueba, si no eliges un plan tu cuenta pasa a solo lectura — nada se borra.
        </div>
      )}
    </div>
  );
}
