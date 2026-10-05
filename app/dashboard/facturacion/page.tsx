"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Wallet, AlertTriangle, CheckCircle2, Users, ChevronLeft, ChevronRight, Loader2, Download, Package, Plus, X } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface PatientRow {
  id: number; name: string; initials: string; color: string; status: string;
  sessionValue: number; sessionsMonth: number; amountMonth: number;
  unpaidCount: number; unpaidAmount: number;
}
interface SessionPackage {
  id: number; patientId: number; patientName: string; name: string;
  totalSessions: number; usedSessions: number; remaining: number;
  sessionValue: number; totalPrice: number; paid: boolean;
  startDate: string; expiresAt: string; status: string;
  expired: boolean; endingSoon: boolean; notes: string;
}
interface Finance {
  month: string; currency: string;
  invoicedMonth: number; sessionsMonth: number; paidMonth: number; pendingMonth: number;
  pendingTotal: number; pendingPatients: number;
  byPatient: PatientRow[];
  packages: SessionPackage[];
  packagesEndingSoon: number; packagesExpired: number; packagesUnpaid: number;
}

function money(amount: number, currency: string): string {
  const locale = currency === "ARS" ? "es-AR" : currency === "COP" ? "es-CO" : currency === "USD" ? "en-US" : "es-CL";
  const decimals = currency === "USD" ? 2 : 0;
  return `${currency} ${amount.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function FacturacionPage() {
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [data, setData] = useState<Finance | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"todos" | "deuda">("todos");
  const [showNewPackage, setShowNewPackage] = useState(false);
  const [packageForm, setPackageForm] = useState({ patientId: "", totalSessions: "10", totalPrice: "", expiresAt: "", paid: false, notes: "" });
  const [packageError, setPackageError] = useState("");
  const [savingPackage, setSavingPackage] = useState(false);

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance?month=${m}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(month); }, [month, load]);

  const createPackage = async () => {
    setPackageError("");
    if (!packageForm.patientId) { setPackageError("Elige el usuario del paquete."); return; }
    const total = Number(packageForm.totalSessions);
    if (!total || total < 1) { setPackageError("Indica cuántas sesiones incluye el paquete."); return; }
    setSavingPackage(true);
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: Number(packageForm.patientId),
          totalSessions: total,
          totalPrice: packageForm.totalPrice ? Number(packageForm.totalPrice) : undefined,
          expiresAt: packageForm.expiresAt,
          paid: packageForm.paid,
          notes: packageForm.notes,
        }),
      });
      if (res.ok) {
        setShowNewPackage(false);
        setPackageForm({ patientId: "", totalSessions: "10", totalPrice: "", expiresAt: "", paid: false, notes: "" });
        await load(month);
      } else {
        const body = await res.json().catch(() => null);
        setPackageError(body?.error ?? "No se pudo crear el paquete.");
      }
    } catch {
      setPackageError("Error de conexión. Inténtalo de nuevo.");
    }
    setSavingPackage(false);
  };

  const updatePackage = async (id: number, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/packages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) await load(month);
  };

  const removePackage = async (id: number) => {
    if (!confirm("¿Eliminar este paquete? Las sesiones ya realizadas se mantienen.")) return;
    const res = await fetch(`/api/packages/${id}`, { method: "DELETE" });
    if (res.ok) await load(month);
  };

  const exportCSV = () => {
    if (!data) return;
    const headers = ["Usuario", "Valor sesión", "Sesiones del mes", "Facturado del mes", "Sesiones impagas", "Deuda"];
    const rows = data.byPatient.map((p) => [p.name, p.sessionValue, p.sessionsMonth, p.amountMonth, p.unpaidCount, p.unpaidAmount]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? "")}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facturacion-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 animate-pulse" />
      </div>
    );
  }
  if (!data) return <p className="text-center text-slate-400 py-20">No se pudo cargar la facturación</p>;

  const rows = tab === "deuda" ? data.byPatient.filter((p) => p.unpaidCount > 0) : data.byPatient;
  const sinValor = data.byPatient.filter((p) => p.sessionValue === 0).length;

  const cards = [
    { label: "Facturado del mes", value: money(data.invoicedMonth, data.currency), sub: `${data.sessionsMonth} sesiones realizadas`, icon: Wallet, cls: "from-violet-500 to-purple-600", text: "text-violet-700", bg: "bg-violet-50" },
    { label: "Cobrado del mes", value: money(data.paidMonth, data.currency), sub: "sesiones ya pagadas", icon: CheckCircle2, cls: "from-emerald-500 to-teal-600", text: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Pendiente del mes", value: money(data.pendingMonth, data.currency), sub: "por cobrar de este mes", icon: AlertTriangle, cls: "from-amber-500 to-orange-500", text: "text-amber-700", bg: "bg-amber-50" },
    { label: "Deuda total", value: money(data.pendingTotal, data.currency), sub: `${data.pendingPatients} usuario${data.pendingPatients === 1 ? "" : "s"} con deuda`, icon: Users, cls: "from-rose-500 to-pink-600", text: "text-rose-700", bg: "bg-rose-50" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Selector de mes */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 sm:gap-3">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white border border-transparent hover:border-slate-200 active:scale-90 transition-all" aria-label="Mes anterior">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h2 className="text-lg font-bold text-slate-800 first-letter:uppercase flex-1 text-center sm:min-w-[180px]">{monthLabel(data.month)}</h2>
          <button onClick={() => setMonth(shiftMonth(month, 1))} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white border border-transparent hover:border-slate-200 active:scale-90 transition-all" aria-label="Mes siguiente">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-violet-400" />}
        </div>
        <button onClick={exportCSV} className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-medium text-sm hover:border-violet-300 hover:text-violet-700 transition-all">
          <Download className="w-4 h-4" /> Exportar mes
        </button>
      </motion.div>

      {/* Tarjetas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white rounded-2xl border border-slate-200/60 p-4">
            <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center mb-3`}>
              <c.icon className={`w-5 h-5 ${c.text}`} />
            </div>
            <p className={`text-xl font-bold bg-gradient-to-r ${c.cls} bg-clip-text text-transparent`}>{c.value}</p>
            <p className="text-sm font-medium text-slate-600 mt-0.5">{c.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{c.sub}</p>
          </motion.div>
        ))}
      </div>

      {sinValor > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800">
          {sinValor} usuario{sinValor === 1 ? "" : "s"} sin valor de sesión definido: sus sesiones no suman al facturado. Edítalo en la ficha del usuario.
        </div>
      )}

      {/* Paquetes de sesiones */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Package className="w-4 h-4 text-violet-600 shrink-0" />
          <h3 className="font-bold text-slate-800 text-sm flex-1">Paquetes de sesiones</h3>
          <button
            onClick={() => { setPackageError(""); setShowNewPackage(true); }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-3 py-1.5 rounded-lg font-semibold text-xs hover:from-violet-400 hover:to-purple-500 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Vender paquete
          </button>
        </div>

        {(data.packagesEndingSoon > 0 || data.packagesExpired > 0 || data.packagesUnpaid > 0) && (
          <div className="px-4 pt-3 flex flex-wrap gap-2">
            {data.packagesEndingSoon > 0 && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                {data.packagesEndingSoon} por agotarse
              </span>
            )}
            {data.packagesExpired > 0 && (
              <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                {data.packagesExpired} vencido{data.packagesExpired === 1 ? "" : "s"} con sesiones sin usar
              </span>
            )}
            {data.packagesUnpaid > 0 && (
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                {data.packagesUnpaid} sin pagar
              </span>
            )}
          </div>
        )}

        {data.packages.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10 px-4">
            Aún no vendes paquetes. Un paquete son N sesiones prepagadas con vigencia: las sesiones se van descontando solas.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.packages.map((pkg) => {
              const pct = Math.min(100, Math.round((pkg.usedSessions / pkg.totalSessions) * 100));
              const tone = pkg.expired ? "bg-rose-500" : pkg.endingSoon ? "bg-amber-500" : "bg-violet-500";
              return (
                <div key={pkg.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 text-sm truncate">{pkg.patientName}</p>
                        {pkg.status === "agotado" && <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Agotado</span>}
                        {pkg.expired && pkg.remaining > 0 && <span className="text-[10px] font-bold uppercase tracking-wide text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Vencido</span>}
                        {pkg.endingSoon && <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Por agotarse</span>}
                        {pkg.paid
                          ? <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Pagado</span>
                          : <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Sin pagar</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{pkg.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-800">{money(pkg.totalPrice, data.currency)}</p>
                      <p className="text-[11px] text-slate-400">{pkg.expiresAt ? `Vence ${pkg.expiresAt}` : "Sin vencimiento"}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${tone} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs font-semibold text-slate-600 shrink-0">
                      {pkg.usedSessions}/{pkg.totalSessions} usadas · quedan {pkg.remaining}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {!pkg.paid && (
                      <button onClick={() => updatePackage(pkg.id, { paid: true })} className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors">
                        Marcar como pagado
                      </button>
                    )}
                    {pkg.status !== "cerrado" && (
                      <button onClick={() => updatePackage(pkg.id, { status: "cerrado" })} className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                        Cerrar
                      </button>
                    )}
                    <button onClick={() => removePackage(pkg.id)} className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-100 transition-colors ml-auto">
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Detalle por usuario */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <h3 className="font-bold text-slate-800 text-sm flex-1">Detalle por usuario</h3>
          <div className="flex gap-1.5">
            <button onClick={() => setTab("todos")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === "todos" ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"}`}>Todos</button>
            <button onClick={() => setTab("deuda")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === "deuda" ? "bg-rose-100 text-rose-700" : "text-slate-500 hover:bg-slate-100"}`}>Con deuda</button>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">{tab === "deuda" ? "Nadie tiene sesiones pendientes de pago 🎉" : "Aún no hay usuarios"}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((p) => (
              <button key={p.id} onClick={() => router.push("/dashboard/usuarios")} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50/50 transition-colors text-left">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${p.color.startsWith("#") ? "" : `bg-gradient-to-br ${p.color}`}`} style={p.color.startsWith("#") ? { background: p.color } : {}}>
                  {p.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 truncate">{p.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {p.sessionsMonth} {p.sessionsMonth === 1 ? "sesión" : "sesiones"} este mes · {p.sessionValue > 0 ? money(p.sessionValue, data.currency) + " c/u" : "sin valor definido"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-700">{money(p.amountMonth, data.currency)}</p>
                  {p.unpaidCount > 0 ? (
                    <p className="text-[11px] font-semibold text-rose-600">Debe {money(p.unpaidAmount, data.currency)} · {p.unpaidCount} {p.unpaidCount === 1 ? "sesión" : "sesiones"}</p>
                  ) : (
                    <p className="text-[11px] text-emerald-600">Al día</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Vender paquete */}
      <Modal
        open={showNewPackage}
        onClose={() => setShowNewPackage(false)}
        title="Vender paquete de sesiones"
        footer={
          <button
            onClick={createPackage}
            disabled={savingPackage}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/30"
          >
            {savingPackage ? "Guardando..." : "Crear paquete"}
          </button>
        }
      >
        <div className="space-y-4">
          {packageError && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-3 py-2.5">
              <X className="w-4 h-4 mt-0.5 shrink-0" /> {packageError}
            </div>
          )}
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Usuario *</label>
            <select
              value={packageForm.patientId}
              onChange={(e) => {
                const id = e.target.value;
                const p = data.byPatient.find((x) => String(x.id) === id);
                const total = Number(packageForm.totalSessions) || 0;
                setPackageForm({ ...packageForm, patientId: id, totalPrice: p && p.sessionValue > 0 ? String(p.sessionValue * total) : packageForm.totalPrice });
                setPackageError("");
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
            >
              <option value="">Seleccionar usuario...</option>
              {data.byPatient.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Sesiones *</label>
              <input
                type="number"
                min={1}
                max={200}
                value={packageForm.totalSessions}
                onChange={(e) => {
                  const total = e.target.value;
                  const p = data.byPatient.find((x) => String(x.id) === packageForm.patientId);
                  setPackageForm({ ...packageForm, totalSessions: total, totalPrice: p && p.sessionValue > 0 ? String(p.sessionValue * (Number(total) || 0)) : packageForm.totalPrice });
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Precio total</label>
              <input
                type="number"
                min={0}
                value={packageForm.totalPrice}
                onChange={(e) => setPackageForm({ ...packageForm, totalPrice: e.target.value })}
                placeholder="Automático"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Vence el</label>
            <input
              type="date"
              value={packageForm.expiresAt}
              onChange={(e) => setPackageForm({ ...packageForm, expiresAt: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">Déjalo vacío si el paquete no vence.</p>
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer hover:border-violet-300 transition-all">
            <input
              type="checkbox"
              checked={packageForm.paid}
              onChange={(e) => setPackageForm({ ...packageForm, paid: e.target.checked })}
              className="mt-0.5 w-4 h-4 accent-violet-600"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-700">Ya está pagado</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">Las sesiones que se descuenten del paquete quedarán cobradas.</span>
            </span>
          </label>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nota</label>
            <textarea
              rows={2}
              value={packageForm.notes}
              onChange={(e) => setPackageForm({ ...packageForm, notes: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
