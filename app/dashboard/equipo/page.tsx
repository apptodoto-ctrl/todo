"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Plus, Users, Shield, UserX, UserCheck, Trash2, Building2, Clock, Wallet } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { PERMISSION_LABELS, DEFAULT_PERMISSIONS, type CenterPermissions } from "@/lib/center";
import { DAY_KEYS, DAY_LABELS, type WeekSchedule } from "@/lib/schedule";

interface Member {
  id: string; email: string; name: string; role: string; active: boolean;
  permissions: CenterPermissions; pending: boolean; patients: number;
  joinedAt: string | null; lastSeenAt: string | null;
  schedule: WeekSchedule | null;
  payMode: string;
  payValue: number;
}
interface CenterInfo {
  center: { id: string; name: string; attendanceMode: string } | null;
  role: string;
  seats?: { total: number; used: number; free: number };
}

const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all";

export default function EquipoPage() {
  const [info, setInfo] = useState<CenterInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", permissions: { ...DEFAULT_PERMISSIONS } });
  const [centerForm, setCenterForm] = useState({ name: "", address: "", taxId: "", phone: "", attendanceMode: "ambos" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [permisosDe, setPermisosDe] = useState<Member | null>(null);
  const [horarioDe, setHorarioDe] = useState<Member | null>(null);
  const [horario, setHorario] = useState<WeekSchedule>({});
  const [pagoDe, setPagoDe] = useState<Member | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/center");
      const data: CenterInfo = await res.json();
      setInfo(data);
      if (data.center && data.role === "administradora") {
        const r = await fetch("/api/center/members");
        if (r.ok) setMembers(await r.json());
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const crearCentro = async () => {
    setError(""); setSaving(true);
    const res = await fetch("/api/center", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(centerForm) });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => null); setError(d?.error ?? "No se pudo crear el Centro."); return; }
    setShowCreate(false); await load();
  };

  const invitar = async (confirmExtraSeat = false) => {
    setError(""); setSaving(true);
    const res = await fetch("/api/center/members", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, confirmExtraSeat }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      if (d?.needsExtraSeat) {
        if (confirm(`Estás usando los ${d.seats.total} cupos de tu plan. Sumar una terapeuta más agrega un cupo extra, que se cobra en tu próxima factura.\n\n¿Agregar el cupo y enviar la invitación?`)) {
          await invitar(true);
        }
        return;
      }
      setError(d?.error ?? "No se pudo enviar la invitación."); return;
    }
    setShowInvite(false);
    setForm({ name: "", email: "", permissions: { ...DEFAULT_PERMISSIONS } });
    await load();
  };

  const guardarPermisos = async (m: Member, permissions: CenterPermissions) => {
    setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, permissions } : x)));
    await fetch(`/api/center/members/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ permissions }) });
  };

  const cambiarEstado = async (m: Member) => {
    const res = await fetch(`/api/center/members/${m.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !m.active }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      if (d?.needsTransfer) {
        const otras = members.filter((x) => x.active && x.email !== m.email && !x.pending);
        const destino = prompt(
          `${d.error}\n\nEscribe el correo de quien recibe sus pacientes:\n${otras.map((o) => `· ${o.email}`).join("\n")}\n\nDéjalo vacío para dejarlos sin terapeuta a cargo.`
        );
        if (destino === null) return;
        const r2 = await fetch(`/api/center/members/${m.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: false, ...(destino.trim() ? { transferTo: destino.trim() } : { leaveUnassigned: true }) }),
        });
        if (!r2.ok) { const e = await r2.json().catch(() => null); alert(e?.error ?? "No se pudo desactivar."); return; }
      } else { alert(d?.error ?? "No se pudo cambiar."); return; }
    }
    await load();
  };

  const abrirHorario = (m: Member) => {
    const base: WeekSchedule = {};
    for (const d of DAY_KEYS) base[d] = m.schedule?.[d] ?? [];
    setHorario(base);
    setHorarioDe(m);
  };

  const guardarHorario = async () => {
    if (!horarioDe) return;
    await fetch(`/api/center/members/${horarioDe.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule: horario }),
    });
    setHorarioDe(null);
    await load();
  };

  const guardarPago = async (m: Member, payMode: string, payValue: number) => {
    setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, payMode, payValue } : x)));
    setPagoDe((prev) => (prev && prev.id === m.id ? { ...prev, payMode, payValue } : prev));
    await fetch(`/api/center/members/${m.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payMode, payValue }),
    });
  };

  const borrarInvitacion = async (m: Member) => {
    if (!confirm(`¿Quitar la invitación de ${m.name || m.email}?`)) return;
    await fetch(`/api/center/members/${m.id}`, { method: "DELETE" });
    await load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 animate-pulse" /></div>;

  // Cuenta individual: ofrecer convertirla en Centro
  if (!info?.center) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200/60 p-8 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-violet-200" />
          <h2 className="text-lg font-bold text-slate-800">Tu cuenta es individual</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Si trabajas con un equipo, puedes convertirla en un Centro: tú quedas como Administradora, cada terapeuta entra con su propio acceso y toda la información pasa a ser del Centro.
          </p>
          <button onClick={() => { setError(""); setShowCreate(true); }} className="mt-5 inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30">
            <Plus className="w-4 h-4" /> Crear mi Centro
          </button>
        </div>

        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Crear el Centro"
          footer={<button onClick={crearCentro} disabled={saving || !centerForm.name.trim()} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition-all">{saving ? "Creando..." : "Crear Centro"}</button>}>
          <div className="space-y-4">
            {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-3 py-2.5">{error}</div>}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800">
              Tus pacientes, agenda, informes y cobros pasarán a ser del Centro. Tú quedas como Administradora y sigues viéndolo todo.
            </div>
            <div><label className="text-sm font-semibold text-slate-700 block mb-1.5">Nombre del Centro *</label>
              <input type="text" value={centerForm.name} onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })} className={inputCls} placeholder="Ej. Centro Ñandubay" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-semibold text-slate-700 block mb-1.5">Teléfono</label>
                <input type="text" value={centerForm.phone} onChange={(e) => setCenterForm({ ...centerForm, phone: e.target.value })} className={inputCls} /></div>
              <div><label className="text-sm font-semibold text-slate-700 block mb-1.5">RUT / CUIT</label>
                <input type="text" value={centerForm.taxId} onChange={(e) => setCenterForm({ ...centerForm, taxId: e.target.value })} className={inputCls} /></div>
            </div>
            <div><label className="text-sm font-semibold text-slate-700 block mb-1.5">Dirección</label>
              <input type="text" value={centerForm.address} onChange={(e) => setCenterForm({ ...centerForm, address: e.target.value })} className={inputCls} placeholder="Si tienen lugar físico" /></div>
            <div><label className="text-sm font-semibold text-slate-700 block mb-1.5">¿Cómo atiende el Centro?</label>
              <select value={centerForm.attendanceMode} onChange={(e) => setCenterForm({ ...centerForm, attendanceMode: e.target.value })} className={`${inputCls} bg-white`}>
                <option value="centro">Solo en nuestro lugar físico</option>
                <option value="domicilio">Solo a domicilio</option>
                <option value="ambos">De las dos formas</option>
              </select></div>
          </div>
        </Modal>
      </div>
    );
  }

  if (info.role !== "administradora") {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200/60 p-8 text-center">
        <Users className="w-10 h-10 mx-auto mb-3 text-slate-200" />
        <h2 className="font-bold text-slate-700">Perteneces a {info.center.name}</h2>
        <p className="text-sm text-slate-500 mt-1.5">El equipo lo administra la Administradora del Centro.</p>
      </div>
    );
  }

  const seats = info.seats ?? { total: 0, used: 0, free: 0 };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="font-bold text-slate-800">{info.center.name}</p>
          <p className="text-sm text-slate-500">
            {seats.used} de {seats.total} {seats.total === 1 ? "cupo usado" : "cupos usados"}
            {seats.free > 0 ? ` · quedan ${seats.free}` : " · sin cupos libres"}
          </p>
        </div>
        <button onClick={() => { setError(""); setShowInvite(true); }} className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30">
          <Plus className="w-4 h-4" /> Invitar terapeuta
        </button>
      </motion.div>

      <div className="space-y-3">
        {members.map((m) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-2xl border border-slate-200/60 p-4 ${m.active ? "" : "opacity-60"}`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${m.role === "administradora" ? "bg-gradient-to-br from-violet-500 to-purple-600" : "bg-gradient-to-br from-blue-500 to-indigo-600"}`}>
                {(m.name || m.email).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-800 text-sm truncate">{m.name || m.email}</p>
                  {m.role === "administradora" && <span className="text-[10px] font-bold uppercase tracking-wide text-violet-600 bg-violet-50 px-2 py-0.5 rounded">Administradora</span>}
                  {m.pending && <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Invitación enviada</span>}
                  {!m.active && <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Desactivada</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{m.email}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {m.patients} {m.patients === 1 ? "paciente" : "pacientes"} a cargo
                  {m.lastSeenAt ? ` · última entrada ${new Date(m.lastSeenAt).toLocaleDateString("es-CL")}` : m.joinedAt ? "" : " · aún no entra"}
                </p>
              </div>
            </div>

            {m.role !== "administradora" && (
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => setPermisosDe(m)} className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-lg hover:bg-violet-100 transition-colors">
                  <Shield className="w-3 h-3" /> Permisos
                </button>
                <button onClick={() => abrirHorario(m)} className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                  <Clock className="w-3 h-3" /> Horario
                </button>
                <button onClick={() => setPagoDe(m)} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors">
                  <Wallet className="w-3 h-3" /> Pago
                </button>
                <button onClick={() => cambiarEstado(m)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                  {m.active ? <><UserX className="w-3 h-3" /> Desactivar</> : <><UserCheck className="w-3 h-3" /> Reactivar</>}
                </button>
                {m.pending && (
                  <button onClick={() => borrarInvitacion(m)} className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-100 transition-colors ml-auto">
                    <Trash2 className="w-3 h-3" /> Quitar invitación
                  </button>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invitar a una terapeuta"
        footer={<button onClick={() => invitar()} disabled={saving} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition-all">{saving ? "Enviando..." : "Enviar invitación"}</button>}>
        <div className="space-y-4">
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-3 py-2.5">{error}</div>}
          <div><label className="text-sm font-semibold text-slate-700 block mb-1.5">Nombre *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></div>
          <div><label className="text-sm font-semibold text-slate-700 block mb-1.5">Correo *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="terapeuta@correo.com" />
            <p className="text-[11px] text-slate-400 mt-1.5">Recibirá un correo para crear su contraseña y entrar con su propio acceso.</p></div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Qué podrá hacer</p>
            <div className="space-y-1.5">
              {(Object.keys(PERMISSION_LABELS) as (keyof CenterPermissions)[]).map((k) => (
                <label key={k} className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={form.permissions[k]} onChange={(e) => setForm({ ...form, permissions: { ...form.permissions, [k]: e.target.checked } })} className="w-4 h-4 accent-violet-600" />
                  {PERMISSION_LABELS[k]}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Siempre podrá atender a sus pacientes y ver su propia agenda. Nunca ve la agenda del Centro completo.</p>
          </div>
        </div>
      </Modal>

      <Modal open={!!pagoDe} onClose={() => setPagoDe(null)} title={`Pago de ${pagoDe?.name || pagoDe?.email || ""}`}
        footer={<button onClick={() => setPagoDe(null)} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl transition-all">Listo</button>}>
        {pagoDe && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Cómo se le paga</label>
              <select
                value={pagoDe.payMode}
                onChange={(e) => guardarPago(pagoDe, e.target.value, pagoDe.payValue)}
                className={`${inputCls} bg-white`}
              >
                <option value="porcentaje">Porcentaje de cada sesión</option>
                <option value="fijo_sesion">Monto fijo por sesión</option>
                <option value="sueldo">Sueldo mensual fijo</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                {pagoDe.payMode === "porcentaje" ? "Porcentaje" : pagoDe.payMode === "fijo_sesion" ? "Monto por sesión" : "Sueldo mensual"}
              </label>
              <input
                type="number"
                min={0}
                defaultValue={pagoDe.payValue}
                onBlur={(e) => guardarPago(pagoDe, pagoDe.payMode, Number(e.target.value) || 0)}
                className={inputCls}
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                {pagoDe.payMode === "porcentaje"
                  ? "Se calcula sobre lo que generan sus sesiones realizadas en el mes."
                  : pagoDe.payMode === "fijo_sesion"
                    ? "Se multiplica por sus sesiones realizadas en el mes."
                    : "Se paga completo, sin importar cuántas sesiones haga."}
              </p>
            </div>
            <p className="text-[11px] text-slate-500 bg-slate-50 rounded-xl px-3 py-2.5">
              El resumen aparece en Facturación. Cada terapeuta ve solo lo suyo, nunca lo de sus compañeras ni las finanzas del Centro.
            </p>
          </div>
        )}
      </Modal>

      <Modal open={!!horarioDe} onClose={() => setHorarioDe(null)} title={`Horario de ${horarioDe?.name || horarioDe?.email || ""}`}
        footer={<button onClick={guardarHorario} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl transition-all">Guardar horario</button>}>
        <div className="space-y-2.5">
          <p className="text-xs text-slate-500">
            TOdo no deja agendarle sesiones fuera de este horario. Si lo dejas vacío, puede atender a cualquier hora.
          </p>
          {DAY_KEYS.map((d) => {
            const tramos = horario[d] ?? [];
            return (
              <div key={d} className="flex items-start gap-2">
                <span className="text-xs font-semibold text-slate-600 w-20 shrink-0 pt-2">{DAY_LABELS[d]}</span>
                <div className="flex-1 min-w-0 space-y-1.5">
                  {tramos.length === 0 && <p className="text-xs text-slate-300 py-2">No atiende</p>}
                  {tramos.map((t, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input type="time" value={t.from}
                        onChange={(e) => setHorario({ ...horario, [d]: tramos.map((x, j) => j === i ? { ...x, from: e.target.value } : x) })}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                      <span className="text-slate-400 text-xs">a</span>
                      <input type="time" value={t.to}
                        onChange={(e) => setHorario({ ...horario, [d]: tramos.map((x, j) => j === i ? { ...x, to: e.target.value } : x) })}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                      <button onClick={() => setHorario({ ...horario, [d]: tramos.filter((_, j) => j !== i) })} className="text-slate-300 hover:text-rose-500 text-sm px-1">✕</button>
                    </div>
                  ))}
                  {tramos.length < 4 && (
                    <button onClick={() => setHorario({ ...horario, [d]: [...tramos, { from: "09:00", to: "18:00" }] })} className="text-xs font-semibold text-violet-600 hover:text-violet-700">
                      + Agregar tramo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      <Modal open={!!permisosDe} onClose={() => setPermisosDe(null)} title={`Permisos de ${permisosDe?.name || permisosDe?.email || ""}`}
        footer={<button onClick={() => setPermisosDe(null)} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl transition-all">Listo</button>}>
        {permisosDe && (
          <div className="space-y-1.5">
            {(Object.keys(PERMISSION_LABELS) as (keyof CenterPermissions)[]).map((k) => (
              <label key={k} className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={permisosDe.permissions[k]}
                  onChange={(e) => {
                    const next = { ...permisosDe.permissions, [k]: e.target.checked };
                    setPermisosDe({ ...permisosDe, permissions: next });
                    guardarPermisos(permisosDe, next);
                  }}
                  className="w-4 h-4 accent-violet-600"
                />
                {PERMISSION_LABELS[k]}
              </label>
            ))}
            <p className="text-[11px] text-slate-400 pt-2">Los cambios se guardan solos.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
