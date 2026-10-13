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
interface PatientMonth {
  month: string; currency: string;
  therapist: { name: string; specialty: string };
  patient: { id: number; name: string; rut: string; guardian: string; sessionValue: number };
  sessions: { id: number; date: string; duration: number; attended: boolean; paid: boolean; inPackage: boolean; value: number }[];
  attendedCount: number; missedCount: number; withoutValue: number;
  total: number; paid: number; pending: number;
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
  const [packageForm, setPackageForm] = useState({ patientId: "", totalSessions: "10", totalPrice: "", startDate: "", expiresAt: "", paid: false, notes: "" });
  const [packageError, setPackageError] = useState("");
  const [savingPackage, setSavingPackage] = useState(false);
  const [detail, setDetail] = useState<PatientMonth | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
          startDate: packageForm.startDate,
          expiresAt: packageForm.expiresAt,
          paid: packageForm.paid,
          notes: packageForm.notes,
        }),
      });
      if (res.ok) {
        setShowNewPackage(false);
        setPackageForm({ patientId: "", totalSessions: "10", totalPrice: "", startDate: "", expiresAt: "", paid: false, notes: "" });
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

  const abrirResumen = async (patientId: number) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/finance/patient?patientId=${patientId}&month=${month}`);
      if (res.ok) setDetail(await res.json());
    } finally {
      setDetailLoading(false);
    }
  };

  /** Hoja mensual lista para adjuntar a la boleta de la familia */
  const imprimirResumen = () => {
    if (!detail) return;
    const filas = detail.sessions.map((s) => `
      <tr>
        <td>${s.date.split("-").reverse().join("-")}</td>
        <td>${s.duration} min</td>
        <td>${s.attended ? "Realizada" : "No asistió"}${s.inPackage ? " · paquete" : ""}</td>
        <td class="num">${s.attended ? money(s.value, detail.currency) : "—"}</td>
        <td>${s.attended ? (s.paid ? "Pagada" : "Pendiente") : "—"}</td>
      </tr>`).join("");
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Resumen ${detail.patient.name}</title><style>
      body{font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:30px auto;padding:0 22px;color:#1e293b}
      .letterhead{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #7c3aed;padding-bottom:12px;margin-bottom:16px}
      .brand{font-size:20px;font-weight:bold;color:#7c3aed}
      .quien{text-align:right;font-size:11px;color:#475569}
      h1{font-size:17px;margin:0 0 4px}
      .meta{font-size:12px;color:#64748b;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:18px}
      th{text-align:left;background:#f8fafc;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:.03em;padding:7px 8px;border-bottom:2px solid #e2e8f0}
      td{padding:7px 8px;border-bottom:1px solid #f1f5f9}
      .num{text-align:right}
      .totales{margin-left:auto;width:280px;font-size:13px}
      .totales div{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f1f5f9}
      .totales .grande{font-weight:bold;font-size:15px;border-bottom:none;border-top:2px solid #7c3aed;padding-top:8px}
      @media print{body{margin:12px auto}}
    </style></head><body>
      <div class="letterhead"><div class="brand">TOdo Therapy</div><div class="quien"><strong>${detail.therapist.name}</strong><br/>${detail.therapist.specialty}</div></div>
      <h1>Resumen de sesiones · ${monthLabel(detail.month)}</h1>
      <div class="meta">${detail.patient.name}${detail.patient.rut ? ` · ${detail.patient.rut}` : ""}${detail.patient.guardian ? ` · Tutor: ${detail.patient.guardian}` : ""}</div>
      <table><thead><tr><th>Fecha</th><th>Duración</th><th>Estado</th><th class="num">Valor</th><th>Cobro</th></tr></thead><tbody>${filas}</tbody></table>
      <div class="totales">
        <div><span>Sesiones realizadas</span><span>${detail.attendedCount}</span></div>
        ${detail.missedCount > 0 ? `<div><span>Inasistencias</span><span>${detail.missedCount}</span></div>` : ""}
        <div><span>Pagado</span><span>${money(detail.paid, detail.currency)}</span></div>
        <div><span>Pendiente</span><span>${money(detail.pending, detail.currency)}</span></div>
        <div class="grande"><span>Total del mes</span><span>${money(detail.total, detail.currency)}</span></div>
      </div>
    </body></html>`;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 2000); }, 300);
  };

  const copiarResumen = async () => {
    if (!detail) return;
    const lineas = [
      `Resumen de sesiones · ${monthLabel(detail.month)}`,
      detail.patient.name,
      "",
      ...detail.sessions.map((s) => `${s.date.split("-").reverse().join("-")} · ${s.attended ? "realizada" : "no asistió"}${s.attended ? ` · ${money(s.value, detail.currency)} · ${s.paid ? "pagada" : "pendiente"}` : ""}`),
      "",
      `Sesiones realizadas: ${detail.attendedCount}`,
      `Total: ${money(detail.total, detail.currency)}`,
      `Pagado: ${money(detail.paid, detail.currency)}`,
      `Pendiente: ${money(detail.pending, detail.currency)}`,
    ].join("\n");
    try { await navigator.clipboard.writeText(lineas); alert("Resumen copiado. Ya puedes pegarlo donde lo necesites."); }
    catch { alert("No se pudo copiar automáticamente."); }
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
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800 flex flex-wrap items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1 min-w-0">
            <strong>{sinValor} usuario{sinValor === 1 ? "" : "s"} sin valor de sesión.</strong>{" "}
            Sus sesiones aparecen en 0 porque falta ese dato, no porque el sistema falle.
          </span>
          <button onClick={() => router.push("/dashboard/usuarios")} className="text-xs font-semibold text-amber-900 bg-white border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">
            Definirlo ahora
          </button>
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
                      <p className="text-[11px] text-slate-400">
                        {pkg.startDate ? `Desde ${pkg.startDate}` : ""}{pkg.startDate && pkg.expiresAt ? " · " : ""}{pkg.expiresAt ? `vence ${pkg.expiresAt}` : pkg.startDate ? "sin vencimiento" : "Sin vencimiento"}
                      </p>
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
                    <button
                      onClick={() => {
                        const value = prompt("¿Desde qué fecha cuentan las sesiones de este paquete? (AAAA-MM-DD)", pkg.startDate || "");
                        if (value === null) return;
                        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) { alert("Escribe la fecha como AAAA-MM-DD, por ejemplo 2026-10-01."); return; }
                        updatePackage(pkg.id, { startDate: value });
                      }}
                      className="text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-lg hover:bg-violet-100 transition-colors"
                    >
                      Cambiar fecha de inicio
                    </button>
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
              <button key={p.id} onClick={() => abrirResumen(p.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50/50 transition-colors text-left">
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
                  {p.sessionValue === 0 && p.sessionsMonth > 0 ? (
                    <>
                      <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">Falta el valor</p>
                      <p className="text-[11px] text-amber-600 mt-0.5">No es un error: defínelo en la ficha</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-slate-700">{money(p.amountMonth, data.currency)}</p>
                      {p.unpaidCount > 0 ? (
                        <p className="text-[11px] font-semibold text-rose-600">Debe {money(p.unpaidAmount, data.currency)} · {p.unpaidCount} {p.unpaidCount === 1 ? "sesión" : "sesiones"}</p>
                      ) : (
                        <p className="text-[11px] text-emerald-600">Al día</p>
                      )}
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Resumen mensual de un usuario, para la boleta */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Resumen · ${detail.patient.name}` : ""}
        subtitle={detail ? monthLabel(detail.month) : ""}
        maxWidth="max-w-xl"
        footer={
          <div className="flex gap-2">
            <button onClick={copiarResumen} className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:border-violet-300 hover:text-violet-700 transition-all">
              Copiar
            </button>
            <button onClick={imprimirResumen} className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30">
              Imprimir / PDF
            </button>
          </div>
        }
      >
        {detail && (
          <div className="space-y-4">
            {detail.sessions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Sin sesiones registradas en {monthLabel(detail.month)}.</p>
            ) : (
              <>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  {detail.sessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 last:border-b-0 text-sm">
                      <span className="font-semibold text-slate-600 w-20 shrink-0">{s.date.split("-").reverse().join("-")}</span>
                      <span className="text-xs text-slate-400 w-14 shrink-0">{s.duration} min</span>
                      <span className="flex-1 min-w-0 text-xs">
                        {s.attended ? (
                          <span className="text-slate-500">{s.inPackage ? "Del paquete" : "Realizada"}</span>
                        ) : (
                          <span className="text-rose-500">No asistió</span>
                        )}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 shrink-0">{s.attended ? money(s.value, detail.currency) : "—"}</span>
                      {s.attended && (
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${s.paid ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"}`}>
                          {s.paid ? "Pagada" : "Pendiente"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {detail.withoutValue > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800">
                    {detail.withoutValue} {detail.withoutValue === 1 ? "sesión aparece" : "sesiones aparecen"} en 0 porque no tienen valor definido. Puedes ponerlo en la ficha del usuario o en cada cita.
                  </div>
                )}

                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Sesiones realizadas</span><span className="font-semibold text-slate-700">{detail.attendedCount}</span></div>
                  {detail.missedCount > 0 && <div className="flex justify-between"><span className="text-slate-500">Inasistencias</span><span className="font-semibold text-slate-700">{detail.missedCount}</span></div>}
                  <div className="flex justify-between"><span className="text-slate-500">Pagado</span><span className="font-semibold text-emerald-600">{money(detail.paid, detail.currency)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Pendiente</span><span className="font-semibold text-amber-600">{money(detail.pending, detail.currency)}</span></div>
                  <div className="flex justify-between pt-2 border-t border-slate-200"><span className="font-bold text-slate-700">Total del mes</span><span className="font-bold text-slate-900">{money(detail.total, detail.currency)}</span></div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Empieza el</label>
              <input
                type="date"
                value={packageForm.startDate}
                onChange={(e) => setPackageForm({ ...packageForm, startDate: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Vence el</label>
              <input
                type="date"
                value={packageForm.expiresAt}
                onChange={(e) => setPackageForm({ ...packageForm, expiresAt: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 -mt-2">
            Las sesiones que el usuario ya tenga desde la fecha de inicio se descuentan solas, aunque las hayas registrado antes de crear el paquete. Si lo dejas vacío, empieza hoy. Sin fecha de vencimiento, el paquete no caduca.
          </p>
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
