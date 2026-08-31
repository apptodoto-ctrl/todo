"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Crown, Sparkles, Zap, Ticket, Settings2, ArrowLeft, Plus, Trash2, Loader2, Check } from "lucide-react";

interface Tier {
  id: number; code: string; plan: string; maxPatients: number | null; therapists: number;
  aiCredits: number; priceMonthly: number; priceYearly: number; isAddon: boolean;
  notes: string; sortOrder: number; active: boolean;
}
interface Feature { id: number; key: string; name: string; creditCost: number; esencial: boolean; profesional: boolean; centro: boolean; active: boolean; }
interface Pack { id: number; code: string; credits: number; price: number; active: boolean; }
interface Coupon { id: number; code: string; type: string; value: number; maxRedemptions: number | null; redemptions: number; validUntil: string | null; planRestriction: string | null; description: string; active: boolean; }
interface Setting { key: string; value: string; label: string; }

const inputCls = "w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all";

export default function PricingAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as { role?: string })?.role;

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [error, setError] = useState("");
  const [showNewCoupon, setShowNewCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: "", type: "percent", value: 0, maxRedemptions: "", validUntil: "", planRestriction: "", description: "" });

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/pricing");
    if (!res.ok) { setLoading(false); return; }
    const d = await res.json();
    setTiers(d.tiers ?? []);
    setFeatures(d.features ?? []);
    setPacks(d.packs ?? []);
    setCoupons(d.coupons ?? []);
    setSettings(d.settings ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (role !== "admin") { router.replace("/dashboard/inicio"); return; }
    load();
  }, [status, role, router, load]);

  const save = async (entity: string, idOrKey: number | string, data: Record<string, unknown>, uiKey: string) => {
    setSavingKey(uiKey);
    setError("");
    const body = entity === "setting"
      ? { entity, key: idOrKey, data }
      : { entity, id: idOrKey, data };
    const res = await fetch("/api/admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSavingKey("");
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error || "No se pudo guardar");
      setTimeout(() => setError(""), 4000);
      return false;
    }
    setSavedKey(uiKey);
    setTimeout(() => setSavedKey(""), 1500);
    return true;
  };

  const createCoupon = async () => {
    if (!newCoupon.code.trim()) return;
    setSavingKey("newcoupon");
    const res = await fetch("/api/admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "coupon",
        data: {
          code: newCoupon.code,
          type: newCoupon.type,
          value: Number(newCoupon.value) || 0,
          maxRedemptions: newCoupon.maxRedemptions === "" ? null : Number(newCoupon.maxRedemptions),
          validUntil: newCoupon.validUntil || null,
          planRestriction: newCoupon.planRestriction || null,
          description: newCoupon.description,
          active: true,
        },
      }),
    });
    setSavingKey("");
    if (res.ok) {
      setShowNewCoupon(false);
      setNewCoupon({ code: "", type: "percent", value: 0, maxRedemptions: "", validUntil: "", planRestriction: "", description: "" });
      load();
    } else {
      const d = await res.json().catch(() => null);
      setError(d?.error || "No se pudo crear el cupón");
      setTimeout(() => setError(""), 4000);
    }
  };

  const deleteCoupon = async (id: number) => {
    if (!confirm("¿Eliminar este cupón?")) return;
    const res = await fetch(`/api/admin/pricing?entity=coupon&id=${id}`, { method: "DELETE" });
    if (res.ok) setCoupons((prev) => prev.filter((c) => c.id !== id));
  };

  const SaveBtn = ({ uiKey, onClick }: { uiKey: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      disabled={savingKey === uiKey}
      className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
        savedKey === uiKey
          ? "bg-emerald-100 text-emerald-600"
          : "bg-violet-50 text-violet-600 hover:bg-violet-100"
      }`}
    >
      {savingKey === uiKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedKey === uiKey ? <Check className="w-3.5 h-3.5" /> : "Guardar"}
    </button>
  );

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      {error && (
        <div className="fixed top-6 right-6 z-50 bg-rose-500 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">{error}</div>
      )}

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button onClick={() => router.push("/dashboard/admin")} className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-xl transition-all text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
          <Crown className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Planes y precios</h1>
          <p className="text-sm text-slate-500">Edita escalones, créditos, recargas, cupones y reglas sin necesidad de un despliegue</p>
        </div>
      </motion.div>

      {/* Escalones */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-4 h-4 text-violet-500" />
          <h2 className="font-semibold text-slate-800">Planes y escalones</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-[11px] text-slate-400 uppercase tracking-wide text-left">
                <th className="pb-2 pr-3">Código</th>
                <th className="pb-2 pr-3">Plan</th>
                <th className="pb-2 pr-3 w-24">Pacientes</th>
                <th className="pb-2 pr-3 w-16">TOs</th>
                <th className="pb-2 pr-3 w-24">Créditos IA</th>
                <th className="pb-2 pr-3 w-20">$/mes</th>
                <th className="pb-2 pr-3 w-20">$/año</th>
                <th className="pb-2 pr-3 w-16">Activo</th>
                <th className="pb-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t, i) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="py-2 pr-3 font-mono text-xs text-slate-500">{t.code}{t.isAddon && <span className="ml-1 text-[10px] bg-amber-100 text-amber-600 px-1 rounded">extra</span>}</td>
                  <td className="py-2 pr-3 font-semibold text-slate-700">{t.plan}</td>
                  <td className="py-2 pr-3">
                    <input type="text" value={t.maxPatients ?? ""} placeholder="sin tope" onChange={(e) => setTiers((p) => p.map((x, j) => j === i ? { ...x, maxPatients: e.target.value === "" ? null : Number(e.target.value) } : x))} className={inputCls} />
                  </td>
                  <td className="py-2 pr-3"><input type="number" value={t.therapists} onChange={(e) => setTiers((p) => p.map((x, j) => j === i ? { ...x, therapists: Number(e.target.value) } : x))} className={inputCls} /></td>
                  <td className="py-2 pr-3"><input type="number" value={t.aiCredits} onChange={(e) => setTiers((p) => p.map((x, j) => j === i ? { ...x, aiCredits: Number(e.target.value) } : x))} className={inputCls} /></td>
                  <td className="py-2 pr-3"><input type="number" value={t.priceMonthly} onChange={(e) => setTiers((p) => p.map((x, j) => j === i ? { ...x, priceMonthly: Number(e.target.value) } : x))} className={inputCls} /></td>
                  <td className="py-2 pr-3"><input type="number" value={t.priceYearly} onChange={(e) => setTiers((p) => p.map((x, j) => j === i ? { ...x, priceYearly: Number(e.target.value) } : x))} className={inputCls} /></td>
                  <td className="py-2 pr-3 text-center"><input type="checkbox" checked={t.active} onChange={(e) => setTiers((p) => p.map((x, j) => j === i ? { ...x, active: e.target.checked } : x))} className="accent-violet-500" /></td>
                  <td className="py-2"><SaveBtn uiKey={`tier-${t.id}`} onClick={() => save("tier", t.id, { maxPatients: t.maxPatients, therapists: t.therapists, aiCredits: t.aiCredits, priceMonthly: t.priceMonthly, priceYearly: t.priceYearly, active: t.active }, `tier-${t.id}`)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">Anual = 10 meses pagados, 12 usados. `centro_extra` es aditivo por terapeuta. Deja &quot;Pacientes&quot; vacío para sin tope.</p>
      </motion.div>

      {/* Funciones IA + Recargas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <h2 className="font-semibold text-slate-800">Funciones de IA</h2>
          </div>
          <div className="space-y-3">
            {features.map((f, i) => (
              <div key={f.id} className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{f.name}</p>
                    <p className="text-[11px] font-mono text-slate-400">{f.key}</p>
                  </div>
                  <SaveBtn uiKey={`feat-${f.id}`} onClick={() => save("feature", f.id, { creditCost: f.creditCost, esencial: f.esencial, profesional: f.profesional, centro: f.centro }, `feat-${f.id}`)} />
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    Costo
                    <input type="number" value={f.creditCost} onChange={(e) => setFeatures((p) => p.map((x, j) => j === i ? { ...x, creditCost: Number(e.target.value) } : x))} className={`${inputCls} w-16`} />
                    créd.
                  </label>
                  {(["esencial", "profesional", "centro"] as const).map((plan) => (
                    <label key={plan} className="flex items-center gap-1 text-xs text-slate-600 capitalize cursor-pointer">
                      <input type="checkbox" checked={f[plan]} onChange={(e) => setFeatures((p) => p.map((x, j) => j === i ? { ...x, [plan]: e.target.checked } : x))} className="accent-violet-500" /> {plan}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-violet-500" />
            <h2 className="font-semibold text-slate-800">Recargas de créditos</h2>
          </div>
          <div className="space-y-3">
            {packs.map((pk, i) => (
              <div key={pk.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                <span className="font-mono text-[11px] text-slate-400 w-24 shrink-0">{pk.code}</span>
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  $<input type="number" value={pk.price} onChange={(e) => setPacks((p) => p.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x))} className={`${inputCls} w-16`} />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input type="number" value={pk.credits} onChange={(e) => setPacks((p) => p.map((x, j) => j === i ? { ...x, credits: Number(e.target.value) } : x))} className={`${inputCls} w-20`} /> créditos
                </label>
                <div className="flex-1" />
                <SaveBtn uiKey={`pack-${pk.id}`} onClick={() => save("pack", pk.id, { price: pk.price, credits: pk.credits }, `pack-${pk.id}`)} />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">Solo disponibles para Profesional y Centro. En la interfaz se muestran como número y barra, sin la palabra &quot;token&quot;.</p>
        </motion.div>
      </div>

      {/* Cupones */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-violet-500" />
            <h2 className="font-semibold text-slate-800">Cupones</h2>
          </div>
          <button onClick={() => setShowNewCoupon(!showNewCoupon)} className="flex items-center gap-1 text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-all">
            <Plus className="w-3.5 h-3.5" /> Nuevo cupón
          </button>
        </div>

        {showNewCoupon && (
          <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <input type="text" placeholder="CÓDIGO" value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} className={inputCls} />
            <select value={newCoupon.type} onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value })} className={inputCls}>
              <option value="percent">percent — % de descuento</option>
              <option value="fixed">fixed — precio fijo</option>
              <option value="free_months">free_months — meses gratis</option>
              <option value="ai_grant">ai_grant — regalo de créditos</option>
            </select>
            <input type="number" placeholder="Valor" value={newCoupon.value || ""} onChange={(e) => setNewCoupon({ ...newCoupon, value: Number(e.target.value) })} className={inputCls} />
            <input type="number" placeholder="Máx. usos (vacío = sin tope)" value={newCoupon.maxRedemptions} onChange={(e) => setNewCoupon({ ...newCoupon, maxRedemptions: e.target.value })} className={inputCls} />
            <input type="date" value={newCoupon.validUntil} onChange={(e) => setNewCoupon({ ...newCoupon, validUntil: e.target.value })} className={inputCls} />
            <select value={newCoupon.planRestriction} onChange={(e) => setNewCoupon({ ...newCoupon, planRestriction: e.target.value })} className={inputCls}>
              <option value="">Cualquier plan</option>
              {tiers.filter((t) => !t.isAddon).map((t) => <option key={t.code} value={t.code}>{t.code}</option>)}
            </select>
            <input type="text" placeholder="Descripción" value={newCoupon.description} onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })} className={`${inputCls} col-span-2 md:col-span-1`} />
            <button onClick={createCoupon} disabled={!newCoupon.code.trim() || savingKey === "newcoupon"} className="bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-lg py-1.5 disabled:opacity-50 transition-all">
              {savingKey === "newcoupon" ? "Creando..." : "Crear"}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {coupons.length === 0 && <p className="text-xs text-slate-400 text-center py-3">Sin cupones</p>}
          {coupons.map((c) => (
            <div key={c.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 group">
              <span className={`font-mono text-xs font-bold px-2 py-1 rounded-lg ${c.active ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-400 line-through"}`}>{c.code}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600 truncate">{c.description || `${c.type} · ${c.value}`}</p>
                <p className="text-[11px] text-slate-400">
                  {c.type} · valor {c.value}
                  {c.maxRedemptions !== null && ` · ${c.redemptions}/${c.maxRedemptions} usos`}
                  {c.planRestriction && ` · solo ${c.planRestriction}`}
                  {c.validUntil && ` · hasta ${new Date(c.validUntil).toLocaleDateString("es-CL")}`}
                </p>
              </div>
              <button
                onClick={async () => { const ok = await save("coupon", c.id, { active: !c.active }, `coupon-${c.id}`); if (ok) setCoupons((prev) => prev.map((x) => x.id === c.id ? { ...x, active: !c.active } : x)); }}
                className={`text-[11px] font-semibold px-2 py-1 rounded-lg transition-all ${c.active ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200" : "bg-slate-200 text-slate-500 hover:bg-slate-300"}`}
              >
                {c.active ? "Activo" : "Inactivo"}
              </button>
              <button onClick={() => deleteCoupon(c.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Configuración general */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-4 h-4 text-violet-500" />
          <h2 className="font-semibold text-slate-800">Prueba gratis y reglas del sistema</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {settings.map((s, i) => (
            <div key={s.key} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-600">{s.label || s.key}</p>
                <p className="text-[11px] font-mono text-slate-400">{s.key}</p>
              </div>
              <input
                type="text"
                value={s.value}
                onChange={(e) => setSettings((p) => p.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                className={`${inputCls} w-32`}
              />
              <SaveBtn uiKey={`set-${s.key}`} onClick={() => save("setting", s.key, { value: s.value }, `set-${s.key}`)} />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
