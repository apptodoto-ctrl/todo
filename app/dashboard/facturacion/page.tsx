"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Wallet, AlertTriangle, CheckCircle2, Users, ChevronLeft, ChevronRight, Loader2, Download } from "lucide-react";

interface PatientRow {
  id: number; name: string; initials: string; color: string; status: string;
  sessionValue: number; sessionsMonth: number; amountMonth: number;
  unpaidCount: number; unpaidAmount: number;
}
interface Finance {
  month: string; currency: string;
  invoicedMonth: number; sessionsMonth: number; paidMonth: number; pendingMonth: number;
  pendingTotal: number; pendingPatients: number;
  byPatient: PatientRow[];
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
    </div>
  );
}
