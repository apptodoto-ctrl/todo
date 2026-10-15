"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Search, ShieldAlert, Building2, User, Loader2, History, Tag } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { STATE_LABELS, ACCOUNT_STATES } from "@/lib/adminPanel";

interface Row {
  email: string; name: string; country: string; currency: string; phone: string;
  createdAt: string; type: string; centerName: string; seats: number | null;
  tier: string | null; state: string; trialEndsAt: string | null;
  betaGroup: string; patients: number; tags: string[];
}

interface Detail {
  user: { email: string; name: string; phone: string; country: string; currency: string; createdAt: string };
  subscription: { tierCode: string; status: string; accountState: string; purchasedCredits: number; trialEndsAt: string | null; currentPeriodEnd: string | null; internalNotes: string } | null;
  center: { name: string; seats: number; extraSeats: number } | null;
  membership: { centerName: string; role: string } | null;
  usage: { patients: number; appointments: number; aiCreditsMonth: number };
  audits: { id: number; actor: string; action: string; reason: string; createdAt: string }[];
}

const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all";

const STATE_TONES: Record<string, string> = {
  trial: "bg-blue-50 text-blue-700 border-blue-200",
  beta: "bg-violet-50 text-violet-700 border-violet-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  past_due: "bg-amber-50 text-amber-700 border-amber-200",
  solo_lectura: "bg-slate-50 text-slate-600 border-slate-200",
  suspendida: "bg-rose-50 text-rose-700 border-rose-200",
  cancelada: "bg-slate-100 text-slate-500 border-slate-200",
  comp: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

export default function CuentasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as { role?: string })?.role;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [actor, setActor] = useState("");
  const [saving, setSaving] = useState(false);
  const [tiers, setTiers] = useState<{ code: string; plan: string; therapists: number; isAddon: boolean }[]>([]);

  useEffect(() => {
    if (role !== "admin") return;
    fetch("/api/admin/pricing").then((r) => r.json()).then((d) => setTiers(Array.isArray(d?.tiers) ? d.tiers.filter((t: { isAddon: boolean }) => !t.isAddon) : [])).catch(() => {});
  }, [role]);

  useEffect(() => {
    if (status === "loading") return;
    if (role !== "admin") router.replace("/dashboard/inicio");
  }, [role, status, router]);

  useEffect(() => {
    // Quién del equipo está usando el panel: queda en cada cambio
    setActor(localStorage.getItem("adminActor") ?? "");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (filtroEstado) p.set("state", filtroEstado);
      if (filtroTipo) p.set("type", filtroTipo);
      const res = await fetch(`/api/admin/accounts?${p}`);
      if (res.ok) setRows(await res.json());
    } finally { setLoading(false); }
  }, [q, filtroEstado, filtroTipo]);

  useEffect(() => { if (role === "admin") void load(); }, [role, load]);

  const abrir = async (email: string) => {
    const res = await fetch(`/api/admin/accounts/${encodeURIComponent(email)}`);
    if (res.ok) setDetail(await res.json());
  };

  const aplicar = async (action: string, extra: Record<string, unknown>, pideMotivo: boolean) => {
    if (!detail) return;
    if (!actor) { alert("Primero dinos quién eres, arriba a la derecha."); return; }
    let reason = "";
    if (pideMotivo) {
      const r = prompt("¿Por qué haces este cambio? Queda anotado en el registro.");
      if (r === null) return;
      if (!r.trim()) { alert("El motivo es obligatorio para este cambio."); return; }
      reason = r.trim();
    }
    setSaving(true);
    const res = await fetch(`/api/admin/accounts/${encodeURIComponent(detail.user.email)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason, actor, ...extra }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => null); alert(d?.error ?? "No se pudo aplicar."); return; }
    await abrir(detail.user.email);
    await load();
  };

  if (status === "loading" || role !== "admin") {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, correo, teléfono o Centro..."
            className="flex-1 min-w-0 text-sm text-slate-700 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
          <ShieldAlert className="w-4 h-4 text-violet-500 shrink-0" />
          <input
            value={actor}
            onChange={(e) => { setActor(e.target.value); localStorage.setItem("adminActor", e.target.value); }}
            placeholder="¿Quién eres?"
            className="w-28 text-sm text-slate-700 focus:outline-none"
          />
        </div>
      </motion.div>

      <div className="flex flex-wrap gap-2">
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-600">
          <option value="">Todas las situaciones</option>
          {ACCOUNT_STATES.map((s) => <option key={s} value={s}>{STATE_LABELS[s]}</option>)}
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-600">
          <option value="">Todos los tipos</option>
          <option value="individual">Individuales</option>
          <option value="centro">Centros</option>
          <option value="subcuenta">Subcuentas</option>
        </select>
        <span className="text-xs text-slate-400 self-center ml-auto">{rows.length} cuentas</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-16">Ninguna cuenta coincide</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((r) => (
              <button key={r.email} onClick={() => abrir(r.email)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50/40 transition-colors text-left">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${r.type === "centro" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
                  {r.type === "centro" ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-700 truncate">{r.name}</p>
                    {r.centerName && <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">{r.centerName}</span>}
                    {r.betaGroup && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{r.betaGroup}</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {r.email} · {r.country} · {r.patients} {r.patients === 1 ? "paciente" : "pacientes"}
                    {r.tier ? ` · ${r.tier}` : ""}
                  </p>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded border shrink-0 ${STATE_TONES[r.state] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}>
                  {STATE_LABELS[r.state] ?? r.state}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.user.name ?? ""} subtitle={detail?.user.email} maxWidth="max-w-2xl">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: "Pacientes", v: String(detail.usage.patients) },
                { l: "Citas", v: String(detail.usage.appointments) },
                { l: "Créditos IA del mes", v: String(detail.usage.aiCreditsMonth) },
              ].map((c) => (
                <div key={c.l} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-slate-700">{c.v}</p>
                  <p className="text-[10px] text-slate-500 leading-tight">{c.l}</p>
                </div>
              ))}
            </div>

            {detail.subscription && (
              <div className="space-y-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Situación</label>
                  <select
                    value={detail.subscription.accountState || detail.subscription.status}
                    onChange={(e) => aplicar("cambiar_estado", { state: e.target.value }, true)}
                    disabled={saving}
                    className={`${inputCls} bg-white`}
                  >
                    {ACCOUNT_STATES.map((s) => <option key={s} value={s}>{STATE_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Plan</label>
                  <select
                    value={detail.subscription.tierCode}
                    onChange={(e) => { if (e.target.value && e.target.value !== detail.subscription?.tierCode) aplicar("cambiar_plan", { tierCode: e.target.value }, true); }}
                    disabled={saving}
                    className={`${inputCls} bg-white`}
                  >
                    {!tiers.some((t) => t.code === detail.subscription?.tierCode) && <option value={detail.subscription.tierCode}>{detail.subscription.tierCode}</option>}
                    {tiers.map((t) => <option key={t.code} value={t.code}>{t.plan}{t.therapists > 1 ? ` · hasta ${t.therapists} terapeutas` : ""} ({t.code})</option>)}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">Cambiar a un plan Centro habilita «Mi equipo» en esa cuenta. No toca el cobro en Stripe.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { const m = prompt("¿Cuántos meses de regalo?", "1"); if (m) aplicar("regalar_meses", { months: Number(m) }, true); }} className="text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1.5 rounded-lg hover:bg-violet-100">
                    Regalar meses
                  </button>
                  <button onClick={() => { const c = prompt("¿Cuántos créditos sumar? (usa un número negativo para quitar)", "50"); if (c) aplicar("ajustar_creditos", { amount: Number(c) }, true); }} className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100">
                    Ajustar créditos
                  </button>
                  <button onClick={() => { const d = prompt("Nueva fecha de fin de prueba (AAAA-MM-DD)"); if (d) aplicar("alargar_prueba", { until: d }, false); }} className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-100">
                    Alargar prueba
                  </button>
                  <button onClick={() => { const g = prompt("Grupo de beta testers", "Beta 2026"); if (g) aplicar("marcar_beta", { betaGroup: g }, false); }} className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg hover:bg-amber-100">
                    Marcar como beta
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-1">
                <Tag className="w-3 h-3" /> Notas internas <span className="font-normal text-slate-400">— el cliente no las ve</span>
              </label>
              <textarea
                rows={2}
                defaultValue={detail.subscription?.internalNotes ?? ""}
                onBlur={(e) => { if (e.target.value !== (detail.subscription?.internalNotes ?? "")) aplicar("notas_internas", { internalNotes: e.target.value }, false); }}
                className={`${inputCls} resize-none`}
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-2">
                <History className="w-3 h-3" /> Historial de cambios
              </p>
              {detail.audits.length === 0 ? (
                <p className="text-xs text-slate-400">Sin cambios registrados.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {detail.audits.map((a) => (
                    <div key={a.id} className="text-[11px] bg-slate-50 rounded-lg px-2.5 py-1.5">
                      <span className="font-semibold text-slate-700">{a.actor}</span>
                      <span className="text-slate-500"> · {a.action} · {new Date(a.createdAt).toLocaleDateString("es-CL")}</span>
                      {a.reason && <p className="text-slate-500 mt-0.5">&ldquo;{a.reason}&rdquo;</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
