"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Plus, Search, Phone, Mail, MoreVertical, Calendar, ClipboardList, User, Activity, Hash, Pencil, Trash2, NotebookPen, Loader2, Target, Download, DollarSign, FolderOpen, Package, Building2, Home, Lock, FileSignature, Send, CheckCircle2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { CURRENCIES, CURRENCY_LABELS } from "@/lib/currency";
import { DEFAULT_COUNTRY, countryConfig, formatDocument } from "@/lib/countries";
import FormFiller, { type Answers } from "@/components/forms/FormFiller";
import type { FormSection } from "@/lib/formTemplates";

interface Patient {
  id: number;
  name: string;
  age: number;
  birthDate: string;
  guardian: string;
  guardianPhone: string;
  guardianEmail: string;
  prevision: string;
  coverageEntity: string;
  therapistEmail: string;
  attendanceMode: string;
  homeAddress: string;
  school: string;
  consultReason: string;
  sessionValue: number;
  diagnosis: string;
  therapist: string;
  sessions: number;
  nextSession: string;
  nextSessionTime: string;
  status: string;
  initials: string;
  color: string;
  phone: string;
  email: string;
  rut: string;
}

interface SessionRecord {
  id: number;
  patientId: number;
  date: string;
  notes: string;
  therapist: string;
  duration: number;
  attended: boolean;
  paid: boolean;
  confirmed: boolean;
}

interface Objective {
  id: number;
  patientId: number;
  title: string;
  status: string;
  progress: number;
}

// Edad calculada desde la fecha de nacimiento; si no hay, usa el campo age
function displayAge(p: { birthDate?: string; age: number }): number {
  if (p.birthDate) {
    const b = new Date(p.birthDate + "T00:00:00");
    if (!isNaN(b.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - b.getFullYear();
      const m = today.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
      return Math.max(0, age);
    }
  }
  return p.age;
}

// Próximas citas agendadas de un paciente (desde el calendario, no un campo manual)
function upcomingFor(
  patientId: number,
  appointments: { id: number; date: string; time: string; type: string; status: string; patientId: number | null }[]
) {
  const now = new Date();
  return appointments
    .filter((a) => a.patientId === patientId && !["cancelada", "asistio", "no_asistio"].includes(a.status))
    .filter((a) => {
      const d = new Date(`${a.date}T${a.time || "00:00"}:00`);
      return !isNaN(d.getTime()) && d >= now;
    })
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

// Formatea un monto con la moneda configurada en la cuenta
function formatMoney(amount: number, currency: string): string {
  const locale = currency === "ARS" ? "es-AR" : currency === "COP" ? "es-CO" : currency === "USD" ? "en-US" : "es-CL";
  const decimals = currency === "USD" ? 2 : 0;
  return `${currency} ${amount.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  activo: { label: "Activo", cls: "bg-emerald-100 text-emerald-700" },
  evaluacion: { label: "En Evaluación", cls: "bg-blue-100 text-blue-700" },
  alta: { label: "Alta", cls: "bg-slate-100 text-slate-600" },
  no_continua: { label: "No continúa", cls: "bg-rose-100 text-rose-700" },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export default function UsuariosPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [therapistFilter, setTherapistFilter] = useState("todas");
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", age: 0, birthDate: "", guardian: "", guardianPhone: "", guardianEmail: "", prevision: "", coverageEntity: "", therapistEmail: "", attendanceMode: "centro", homeAddress: "", consultReason: "", sessionValue: 0, diagnosis: "", status: "activo", nextSession: "", nextSessionTime: "", phone: "", email: "", rut: "" });
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState<Partial<Patient>>({});
  const [sessionRecords, setSessionRecords] = useState<SessionRecord[]>([]);
  const [templates, setTemplates] = useState<{ id: number; name: string; description: string; sections: FormSection[] }[]>([]);
  const [patientForms, setPatientForms] = useState<{ id: number; title: string; templateId: number; answers: Answers; updatedAt: string; template: { name: string; sections: FormSection[] } }[]>([]);
  const [fillingTemplate, setFillingTemplate] = useState<{ id: number; name: string; sections: FormSection[] } | null>(null);
  const [fillingResponse, setFillingResponse] = useState<{ id: number; title: string; answers: Answers; template: { name: string; sections: FormSection[] } } | null>(null);
  const [formAnswers, setFormAnswers] = useState<Answers>({});
  const [savingForm, setSavingForm] = useState(false);
  const [patientPackages, setPatientPackages] = useState<{ id: number; name: string; totalSessions: number; usedSessions: number; remaining: number; expiresAt: string; paid: boolean; status: string; expired: boolean; endingSoon: boolean }[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSession, setNewSession] = useState({ date: "", notes: "", duration: 45, attended: true, paid: false });

  // Confirma de un toque una sesión que entró sola desde el calendario
  const confirmSession = async (s: SessionRecord, attended: boolean) => {
    if (!selectedPatient) return;
    setSessionRecords((prev) => prev.map((x) => (x.id === s.id ? { ...x, attended, confirmed: true } : x)));
    await fetch(`/api/patients/${selectedPatient.id}/sessions/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attended, confirmed: true }),
    });
  };
  const [savingSession, setSavingSession] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionRecord | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [patientDocs, setPatientDocs] = useState<{ id: number; name: string; category: string; size: string; createdAt: string }[]>([]);
  const [appointments, setAppointments] = useState<{ id: number; date: string; time: string; type: string; status: string; patientId: number | null }[]>([]);
  const [newObjective, setNewObjective] = useState("");
  const [savingObjective, setSavingObjective] = useState(false);
  // Pacientes adultos sin tutor: el contacto es del propio paciente
  const [selfContact, setSelfContact] = useState(false);
  const [currency, setCurrency] = useState("CLP");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  // Equipo del Centro: quién puede quedar a cargo de cada paciente
  const [therapists, setTherapists] = useState<{ email: string; name: string; role: string }[]>([]);
  const [centerRole, setCenterRole] = useState("individual");
  // En un Centro, el dinero (valores, pagos, paquetes) lo maneja solo la Administradora
  const puedeDinero = centerRole !== "terapeuta";
  // Documentos que la familia acepta en línea
  const [consentTemplates, setConsentTemplates] = useState<{ id: number; name: string; body: string }[]>([]);
  const [consents, setConsents] = useState<{ id: number; title: string; sentTo: string; sentAt: string; acceptedAt: string | null; acceptedName: string; documentId: number | null }[]>([]);
  const [sendingConsent, setSendingConsent] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<number | null>(null);
  const [notes, setNotes] = useState<{ id: number; body: string; authorName: string; createdAt: string; createdBy: string }[]>([]);
  const [newNote, setNewNote] = useState("");
  const [currencySaved, setCurrencySaved] = useState(false);

  // La moneda es de toda la consulta: se puede cambiar aquí mismo sin ir a Configuración
  const changeCurrency = async (value: string) => {
    const previous = currency;
    setCurrency(value);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: value }),
      });
      if (!res.ok) throw new Error("no se pudo");
      setCurrencySaved(true);
      setTimeout(() => setCurrencySaved(false), 2500);
    } catch {
      setCurrency(previous);
      alert("No se pudo cambiar la moneda. Revisa tu conexión e inténtalo de nuevo.");
    }
  };

  const [debtByPatient, setDebtByPatient] = useState<Record<number, { unpaidCount: number; unpaidAmount: number }>>({});
  const { email: currentUserEmail, name: currentUserName } = useCurrentUser();

  // Moneda configurada en la cuenta (CLP / ARS / USD / COP)
  useEffect(() => {
    fetch("/api/users/me").then((r) => r.json()).then((u) => { if (u?.currency) setCurrency(u.currency); if (u?.country) setCountry(u.country); }).catch(() => {});
    fetch("/api/forms/templates").then((r) => r.json()).then((d) => setTemplates(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/center/therapists").then((r) => r.json()).then((d) => setTherapists(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/center").then((r) => r.json()).then((d) => { if (d?.role) setCenterRole(d.role); }).catch(() => {});
    fetch("/api/consents/templates").then((r) => r.json()).then((d) => setConsentTemplates(Array.isArray(d) ? d : [])).catch(() => {});
    // Las citas agendadas alimentan "Próxima sesión" y "Próximas sesiones" del perfil
    fetch("/api/appointments").then((r) => r.json()).then((d) => setAppointments(Array.isArray(d) ? d : [])).catch(() => {});
    // Deuda por paciente para la alerta del listado y del perfil
    fetch("/api/finance").then((r) => r.json()).then((d) => {
      if (!Array.isArray(d?.byPatient)) return;
      const map: Record<number, { unpaidCount: number; unpaidAmount: number }> = {};
      for (const p of d.byPatient) map[p.id] = { unpaidCount: p.unpaidCount, unpaidAmount: p.unpaidAmount };
      setDebtByPatient(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const close = () => setMenuOpenId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    if (!currentUserEmail) return;
    fetch(`/api/patients?createdBy=${encodeURIComponent(currentUserEmail)}`)
      .then((r) => r.json())
      .then((data) => {
        const list: Patient[] = Array.isArray(data) ? data : [];
        setPatients(list); setLoading(false);
        // Llegada desde Plantillas: ?paciente=ID&plantilla=ID abre la ficha y el formulario
        const sp = new URLSearchParams(window.location.search);
        const pid = Number(sp.get("paciente"));
        const found = pid ? list.find((p) => p.id === pid) : null;
        if (found) {
          setSelectedPatient(found);
          const tid = Number(sp.get("plantilla"));
          if (tid) setPendingTemplateId(tid);
          window.history.replaceState(null, "", window.location.pathname);
        }
      })
      .catch(() => setLoading(false));
  }, [currentUserEmail]);

  useEffect(() => {
    if (!pendingTemplateId || !selectedPatient || templates.length === 0) return;
    const t = templates.find((x) => x.id === pendingTemplateId);
    const timer = setTimeout(() => { if (t) abrirFichaNueva(t); setPendingTemplateId(null); }, 0);
    return () => clearTimeout(timer);
  }, [pendingTemplateId, selectedPatient, templates]);

  const cargarConsents = (patientId: number) => {
    fetch(`/api/consents/requests?patientId=${patientId}`).then((r) => r.json()).then((d) => setConsents(Array.isArray(d) ? d : [])).catch(() => setConsents([]));
  };

  const enviarConsent = async (templateId: number) => {
    if (!selectedPatient) return;
    let email: string | undefined = selectedPatient.guardianEmail || selectedPatient.email || undefined;
    if (!email) {
      const e = prompt("Este usuario no tiene correo del tutor. ¿A qué correo lo enviamos?");
      if (!e) return;
      email = e.trim();
    }
    setSendingConsent(true);
    const res = await fetch("/api/consents/requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: selectedPatient.id, templateId, email }),
    });
    const d = await res.json().catch(() => null);
    setSendingConsent(false);
    if (!res.ok) { alert(d?.error ?? "No se pudo enviar."); return; }
    cargarConsents(selectedPatient.id);
  };

  const retirarConsent = async (id: number) => {
    if (!selectedPatient || !confirm("¿Retirar este documento? El enlace dejará de funcionar.")) return;
    const res = await fetch(`/api/consents/requests/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => null); alert(d?.error ?? "No se pudo retirar."); return; }
    cargarConsents(selectedPatient.id);
  };

  useEffect(() => {
    if (!selectedPatient) { setSessionRecords([]); setObjectives([]); setPatientPackages([]); setPatientForms([]); setNotes([]); setConsents([]); setShowAddSession(false); setEditingSession(null); return; }
    setSessionsLoading(true);
    cargarConsents(selectedPatient.id);
    fetch(`/api/patients/${selectedPatient.id}/sessions`)
      .then((r) => r.json())
      .then((data) => { setSessionRecords(Array.isArray(data) ? data : []); setSessionsLoading(false); })
      .catch(() => setSessionsLoading(false));
    fetch(`/api/patients/${selectedPatient.id}/objectives`)
      .then((r) => r.json())
      .then((data) => setObjectives(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch(`/api/packages?patientId=${selectedPatient.id}`)
      .then((r) => r.json())
      .then((data) => setPatientPackages(Array.isArray(data) ? data : []))
      .catch(() => setPatientPackages([]));
    fetch(`/api/forms/responses?patientId=${selectedPatient.id}`)
      .then((r) => r.json())
      .then((data) => setPatientForms(Array.isArray(data) ? data : []))
      .catch(() => setPatientForms([]));
    fetch(`/api/patients/${selectedPatient.id}/notes`)
      .then((r) => r.json())
      .then((data) => setNotes(Array.isArray(data) ? data : []))
      .catch(() => setNotes([]));
    fetch(`/api/documents?patientId=${selectedPatient.id}`)
      .then((r) => r.json())
      .then((data) => setPatientDocs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [selectedPatient?.id]);

  // Descarga todas las evoluciones del paciente en un solo documento imprimible
  const printEvolutions = () => {
    if (!selectedPatient) return;
    const rows = [...sessionRecords].sort((a, b) => a.date.localeCompare(b.date));
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Evoluciones ${selectedPatient.name}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 780px; margin: 40px auto; padding: 0 24px; color: #1e293b; line-height: 1.6; }
        .letterhead { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #7c3aed; padding-bottom:14px; margin-bottom:18px; }
        .brand { font-size:22px; font-weight:bold; color:#7c3aed; }
        .meta { font-size:12px; color:#475569; text-align:right; }
        h1 { font-size:18px; margin:0 0 4px; }
        .datos { font-size:13px; color:#475569; margin-bottom:22px; }
        .sesion { border:1px solid #e2e8f0; border-radius:10px; padding:12px 14px; margin-bottom:12px; page-break-inside: avoid; }
        .fecha { font-weight:bold; font-size:13px; }
        .tags { font-size:11px; color:#64748b; margin-top:2px; }
        .notas { font-size:13px; white-space:pre-wrap; margin-top:8px; }
        .firma { margin-top:50px; padding-top:8px; border-top:1px solid #94a3b8; width:260px; font-size:12px; color:#475569; text-align:center; }
        @media print { body { margin:20px; } }
      </style></head><body>
      <div class="letterhead">
        <div class="brand">TOdo Therapy</div>
        <div class="meta"><strong>${currentUserName}</strong><br/>Generado el ${new Date().toLocaleDateString("es-CL")}</div>
      </div>
      <h1>Registro de evoluciones</h1>
      <div class="datos">
        <strong>${selectedPatient.name}</strong> · ${displayAge(selectedPatient)} años${selectedPatient.rut ? ` · ${selectedPatient.rut}` : ""}<br/>
        Diagnóstico: ${selectedPatient.diagnosis} · ${rows.length} ${rows.length === 1 ? "sesión registrada" : "sesiones registradas"}
      </div>
      ${rows.map((s) => `
        <div class="sesion">
          <div class="fecha">${s.date.split("-").reverse().join("-")}</div>
          <div class="tags">${s.duration} min · ${s.attended ? "Asistió" : "No asistió"} · ${s.paid ? "Pagada" : "Pendiente de pago"}${s.therapist ? ` · ${s.therapist}` : ""}</div>
          <div class="notas">${(s.notes || "Sin notas registradas.").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        </div>`).join("")}
      <div class="firma">${currentUserName}</div>
      </body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 300);
  };

  const addSession = async () => {
    if (!selectedPatient || !newSession.date) return;
    setSavingSession(true);
    const res = await fetch(`/api/patients/${selectedPatient.id}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newSession, therapist: currentUserName, createdBy: currentUserEmail }),
    });
    if (res.ok) {
      const record = await res.json();
      setSessionRecords((prev) => [record, ...prev].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id));
      setPatients((prev) => prev.map((p) => (p.id === selectedPatient.id ? { ...p, sessions: record.sessions } : p)));
      setSelectedPatient((prev) => (prev ? { ...prev, sessions: record.sessions } : prev));
      setNewSession({ date: "", notes: "", duration: 45, attended: true, paid: false });
      setShowAddSession(false);
    }
    setSavingSession(false);
  };

  const saveEditSession = async () => {
    if (!selectedPatient || !editingSession) return;
    const res = await fetch(`/api/patients/${selectedPatient.id}/sessions/${editingSession.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: editingSession.date,
        notes: editingSession.notes,
        duration: editingSession.duration,
        attended: editingSession.attended,
        paid: editingSession.paid,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSessionRecords((prev) => prev.map((s) => (s.id === updated.id ? updated : s)).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id));
      setEditingSession(null);
    }
  };

  const toggleSessionPaid = async (s: SessionRecord) => {
    if (!selectedPatient) return;
    setSessionRecords((prev) => prev.map((x) => (x.id === s.id ? { ...x, paid: !s.paid } : x)));
    const res = await fetch(`/api/patients/${selectedPatient.id}/sessions/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !s.paid }),
    });
    if (!res.ok) setSessionRecords((prev) => prev.map((x) => (x.id === s.id ? { ...x, paid: s.paid } : x)));
  };

  const addObjective = async () => {
    if (!selectedPatient || !newObjective.trim()) return;
    setSavingObjective(true);
    const res = await fetch(`/api/patients/${selectedPatient.id}/objectives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newObjective }),
    });
    if (res.ok) {
      const obj = await res.json();
      setObjectives((prev) => [...prev, obj]);
      setNewObjective("");
    }
    setSavingObjective(false);
  };

  const updateObjective = async (obj: Objective, changes: Partial<Objective>) => {
    if (!selectedPatient) return;
    setObjectives((prev) => prev.map((o) => (o.id === obj.id ? { ...o, ...changes } : o)));
    const res = await fetch(`/api/patients/${selectedPatient.id}/objectives/${obj.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    if (!res.ok) setObjectives((prev) => prev.map((o) => (o.id === obj.id ? obj : o)));
  };

  const deleteObjective = async (id: number) => {
    if (!selectedPatient || !confirm("¿Eliminar este objetivo?")) return;
    const res = await fetch(`/api/patients/${selectedPatient.id}/objectives/${id}`, { method: "DELETE" });
    if (res.ok) setObjectives((prev) => prev.filter((o) => o.id !== id));
  };

  const exportCSV = () => {
    const headers = ["Nombre", "Edad", "Fecha nacimiento", "Documento", "Diagnóstico", "Estado", "Tutor", "Teléfono tutor", "Cobertura", "Entidad", "Teléfono", "Email", "Sesiones", "Próxima sesión"];
    const rows = patients.map((p) => [
      p.name, displayAge(p), p.birthDate, p.rut, p.diagnosis, statusConfig[p.status]?.label ?? p.status,
      p.guardian, p.guardianPhone, p.prevision, p.coverageEntity, p.phone, p.email, p.sessions, p.nextSession,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pacientes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const abrirFichaNueva = (t: { id: number; name: string; sections: FormSection[] }) => {
    setFillingResponse(null);
    setFormAnswers({});
    setFillingTemplate(t);
  };

  const abrirFichaGuardada = (r: typeof patientForms[number]) => {
    setFillingTemplate(null);
    setFormAnswers(r.answers ?? {});
    setFillingResponse(r);
  };

  const guardarFicha = async () => {
    if (!selectedPatient) return;
    setSavingForm(true);
    try {
      if (fillingResponse) {
        const res = await fetch(`/api/forms/responses/${fillingResponse.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: formAnswers }),
        });
        if (res.ok) {
          const saved = await res.json();
          setPatientForms((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
          setFillingResponse(null);
        }
      } else if (fillingTemplate) {
        const res = await fetch("/api/forms/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId: selectedPatient.id, templateId: fillingTemplate.id, answers: formAnswers }),
        });
        if (res.ok) {
          const saved = await res.json();
          setPatientForms((prev) => [saved, ...prev]);
          setFillingTemplate(null);
        }
      }
    } finally {
      setSavingForm(false);
    }
  };

  const borrarFicha = async (id: number) => {
    if (!confirm("¿Borrar esta ficha llenada?")) return;
    const res = await fetch(`/api/forms/responses/${id}`, { method: "DELETE" });
    if (res.ok) setPatientForms((prev) => prev.filter((x) => x.id !== id));
  };

  /** Imprime la ficha: llenada, o en blanco para completarla a mano */
  const imprimirFicha = (titulo: string, sections: FormSection[], answers: Answers | null) => {
    if (!selectedPatient) return;
    const valor = (f: FormSection["fields"][number]) => {
      if (!answers) return "____________________";
      const v = answers[f.id];
      if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) return "—";
      if (f.type === "si_no") return v === true ? "Sí" : "No";
      return Array.isArray(v) ? v.join(", ") : String(v);
    };
    const cuerpo = sections.map((sec) => `
      <section>
        <h2>${sec.title}</h2>
        ${sec.fields.map((f) => `<p class="campo"><span class="etiqueta">${f.label}:</span> <span class="valor">${valor(f)}</span></p>`).join("")}
      </section>`).join("");
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${titulo}</title><style>
      body{font-family:Arial,Helvetica,sans-serif;max-width:760px;margin:30px auto;padding:0 22px;color:#1e293b;line-height:1.6}
      .letterhead{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #7c3aed;padding-bottom:12px;margin-bottom:14px}
      .brand{font-size:20px;font-weight:bold;color:#7c3aed}
      .quien{text-align:right;font-size:11px;color:#475569}
      h1{font-size:17px;margin:14px 0 2px}
      .meta{font-size:12px;color:#64748b;margin-bottom:18px}
      h2{font-size:13px;color:#7c3aed;margin:18px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:3px}
      .campo{margin:3px 0;font-size:12.5px;page-break-inside:avoid}
      .etiqueta{font-weight:bold;color:#475569}
      .valor{color:#1e293b}
      section{page-break-inside:avoid}
      @media print{body{margin:12px auto}}
    </style></head><body>
      <div class="letterhead"><div class="brand">TOdo Therapy</div><div class="quien"><strong>${selectedPatient.therapist}</strong></div></div>
      <h1>${titulo}</h1>
      <div class="meta">${selectedPatient.name} · ${displayAge(selectedPatient)} años${selectedPatient.rut ? ` · ${selectedPatient.rut}` : ""} &nbsp;·&nbsp; ${new Date().toLocaleDateString("es-CL")}</div>
      ${cuerpo}
    </body></html>`;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 2000); }, 300);
  };

  const agregarNota = async () => {
    if (!selectedPatient || !newNote.trim()) return;
    const res = await fetch(`/api/patients/${selectedPatient.id}/notes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newNote }),
    });
    if (res.ok) {
      const creada = await res.json();
      setNotes((prev) => [creada, ...prev]);
      setNewNote("");
    }
  };

  const borrarNota = async (id: number) => {
    if (!selectedPatient) return;
    const res = await fetch(`/api/patients/${selectedPatient.id}/notes/${id}`, { method: "DELETE" });
    if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const deleteSession = async (sessionId: number) => {
    if (!selectedPatient || !confirm("¿Eliminar esta sesión del historial?")) return;
    const res = await fetch(`/api/patients/${selectedPatient.id}/sessions/${sessionId}`, { method: "DELETE" });
    if (res.ok) {
      const { sessions } = await res.json();
      setSessionRecords((prev) => prev.filter((s) => s.id !== sessionId));
      setPatients((prev) => prev.map((p) => (p.id === selectedPatient.id ? { ...p, sessions } : p)));
      setSelectedPatient((prev) => (prev ? { ...prev, sessions } : prev));
    }
  };

  const addPatient = async () => {
    if (!newPatient.name.trim() || !newPatient.diagnosis.trim()) return;
    const initials = newPatient.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
    const colors = ["from-violet-500 to-purple-600", "from-blue-500 to-indigo-600", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-500", "from-pink-500 to-rose-500"];
    const color = colors[patients.length % colors.length];
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newPatient,
        age: newPatient.birthDate ? displayAge(newPatient) : newPatient.age,
        sessionValue: Number(newPatient.sessionValue) || 0,
        // Adulto sin tutor: el contacto queda como del propio paciente
        ...(selfContact ? { guardian: "", phone: newPatient.guardianPhone, email: newPatient.guardianEmail } : {}),
        therapist: currentUserName,
        sessions: 0,
        initials,
        color,
        createdBy: currentUserEmail,
      }),
    });
    if (res.ok) {
      const patient = await res.json();
      setPatients((prev) => [...prev, patient]);
      setNewPatient({ name: "", age: 0, birthDate: "", guardian: "", guardianPhone: "", guardianEmail: "", prevision: "", coverageEntity: "", therapistEmail: "", attendanceMode: "centro", homeAddress: "", consultReason: "", sessionValue: 0, diagnosis: "", status: "activo", nextSession: "", nextSessionTime: "", phone: "", email: "", rut: "" });
      setShowNewPatient(false);
      setFilter("todos");
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error || "No se pudo crear el usuario");
      if (data?.code === "patient_limit" || data?.code === "subscription_expired") {
        window.location.href = "/dashboard/plan";
      }
    }
  };

  const deletePatient = async (id: number) => {
    if (!confirm("¿Eliminar este usuario?")) return;
    const res = await fetch(`/api/patients/${id}`, { method: "DELETE" });
    if (res.ok) setPatients((prev) => prev.filter((p) => p.id !== id));
  };

  const openEdit = (p: Patient) => {
    setEditForm({ name: p.name, age: p.age, birthDate: p.birthDate, guardian: p.guardian, guardianPhone: p.guardianPhone, guardianEmail: p.guardianEmail, prevision: p.prevision, coverageEntity: p.coverageEntity, consultReason: p.consultReason, sessionValue: p.sessionValue, therapistEmail: p.therapistEmail, attendanceMode: p.attendanceMode, homeAddress: p.homeAddress, diagnosis: p.diagnosis, status: p.status, nextSession: p.nextSession, nextSessionTime: p.nextSessionTime, phone: p.phone, email: p.email, rut: p.rut });
    setEditPatient(p);
    setMenuOpenId(null);
  };

  const saveEdit = async () => {
    if (!editPatient) return;
    const res = await fetch(`/api/patients/${editPatient.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, age: editForm.birthDate ? displayAge(editForm as Patient) : editForm.age, sessionValue: Number(editForm.sessionValue) || 0 }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSelectedPatient((prev) => (prev && prev.id === updated.id ? updated : prev));
      setEditPatient(null);
    }
  };

  const filtered = patients
    .filter((p: Patient) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.diagnosis.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "todos" || p.status === filter;
      const matchTherapist = therapistFilter === "todas" || p.therapistEmail === therapistFilter;
      return matchSearch && matchFilter && matchTherapist;
    })
    // Orden alfabético: es como las terapeutas buscan a sus usuarios
    .sort((a, b) => a.name.trim().localeCompare(b.name.trim(), "es", { sensitivity: "base" }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {centerRole === "administradora" && therapists.length > 1 && (
        <div className="flex items-center gap-2 bg-white border border-slate-200/60 rounded-xl px-3 py-2">
          <Building2 className="w-4 h-4 text-violet-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-600 shrink-0">Terapeuta</span>
          <select
            value={therapistFilter}
            onChange={(e) => setTherapistFilter(e.target.value)}
            className="flex-1 min-w-0 text-sm text-slate-700 bg-transparent focus:outline-none"
          >
            <option value="todas">Todas del Centro</option>
            {therapists.map((t) => (
              <option key={t.email} value={t.email}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-slate-500 text-sm">{patients.length} usuarios registrados</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button onClick={exportCSV} disabled={patients.length === 0} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-medium text-sm hover:border-violet-300 hover:text-violet-700 disabled:opacity-50 transition-all">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button onClick={() => setShowNewPatient(true)} className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30">
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o diagnóstico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: "todos", label: "Todos" },
            { key: "activo", label: "Activos" },
            { key: "evaluacion", label: "Evaluación" },
            { key: "alta", label: "Alta" },
            { key: "no_continua", label: "No continúa" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                filter === f.key
                  ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/25"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Usuarios activos", value: patients.filter(p => p.status === "activo").length, color: "text-emerald-600" },
          { label: "En evaluación", value: patients.filter(p => p.status === "evaluacion").length, color: "text-blue-600" },
          { label: "Dados de alta", value: patients.filter(p => p.status === "alta").length, color: "text-slate-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200/60 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Patient cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        {filtered.map((p) => (
          <motion.div
            key={p.id}
            variants={item}
            className="bg-white rounded-2xl border border-slate-200/60 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 cursor-pointer group overflow-hidden"
          >
            {/* Top bar */}
            <div className={`h-1.5 bg-gradient-to-r ${p.color}`} />

            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 ${p.color.startsWith('#') ? '' : `bg-gradient-to-br ${p.color}`} rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md`}
                    style={p.color.startsWith('#') ? { background: p.color } : {}}
                  >
                    {p.initials}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{p.name}</h3>
                    <p className="text-xs text-slate-400">{displayAge(p)} años</p>
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${statusConfig[p.status]?.cls}`}>
                    {statusConfig[p.status]?.label}
                  </span>
              </div>

              <div className="space-y-2 mb-4">
                {(debtByPatient[p.id]?.unpaidCount ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1.5">
                    <DollarSign className="w-3.5 h-3.5 shrink-0" />
                    <span>Debe {formatMoney(debtByPatient[p.id].unpaidAmount, currency)} · {debtByPatient[p.id].unpaidCount} {debtByPatient[p.id].unpaidCount === 1 ? "sesión" : "sesiones"}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                  <span>{p.diagnosis}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Próxima: {(() => { const n = upcomingFor(p.id, appointments)[0]; return n ? `${n.date.split("-").reverse().join("-")} ${n.time}` : "sin agendar"; })()}</span>
                  {p.attendanceMode === "domicilio" && (
                    <span className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md" title={p.homeAddress || "A domicilio"}>
                      <Home className="w-3 h-3" /> Domicilio
                    </span>
                  )}
                  {centerRole === "administradora" && therapists.length > 1 && (
                    <span className="text-[11px] text-slate-400">· {therapists.find((t) => t.email === p.therapistEmail)?.name ?? "sin terapeuta"}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-600">{p.sessions}</span> sesiones
                </div>
                <div className="flex gap-1.5">
                  <a
                    href={p.email ? `mailto:${p.email}` : undefined}
                    onClick={!p.email ? (e) => e.preventDefault() : undefined}
                    title={p.email || "Sin email"}
                    className={`p-1.5 rounded-lg transition-all ${p.email ? "text-slate-400 hover:text-violet-600 hover:bg-violet-50 cursor-pointer" : "text-slate-200 cursor-not-allowed"}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={p.phone ? `tel:${p.phone}` : undefined}
                    onClick={!p.phone ? (e) => e.preventDefault() : undefined}
                    title={p.phone || "Sin teléfono"}
                    className={`p-1.5 rounded-lg transition-all ${p.phone ? "text-slate-400 hover:text-violet-600 hover:bg-violet-50 cursor-pointer" : "text-slate-200 cursor-not-allowed"}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => setSelectedPatient(p)} className="px-3 py-1.5 text-xs font-medium text-violet-600 hover:text-white hover:bg-gradient-to-r hover:from-violet-500 hover:to-purple-600 border border-violet-200 hover:border-transparent rounded-lg transition-all">
                    Ver perfil
                  </button>
                  <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all" title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deletePatient(p.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Edit Modal */}
      <Modal
        open={!!editPatient}
        onClose={() => setEditPatient(null)}
        title="Editar Usuario"
        footer={
          <button onClick={saveEdit} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30">
            Guardar cambios
          </button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nombre</label>
              <input type="text" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Fecha de nacimiento</label>
              <input type="date" value={editForm.birthDate || ""} onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
              <p className="text-[11px] text-slate-400 mt-1">{editForm.birthDate ? `Edad: ${displayAge(editForm as Patient)} años` : "Si no la sabes, deja vacío"}</p>
            </div>
          </div>
          {!editForm.birthDate && (
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Edad</label>
              <input type="number" min={0} max={120} value={editForm.age || ""} onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
          )}
          <div>
            {centerRole === "administradora" && (
              <div className="mb-4">
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Terapeuta a cargo</label>
                <select
                  value={editForm.therapistEmail || ""}
                  onChange={(e) => setEditForm({ ...editForm, therapistEmail: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
                >
                  {therapists.map((t) => (
                    <option key={t.email} value={t.email}>{t.name}{t.role === "administradora" ? " (Administradora)" : ""}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1.5">Al cambiarla, todo el historial del paciente se va con él.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Dónde se atiende</label>
                <select
                  value={editForm.attendanceMode || "centro"}
                  onChange={(e) => setEditForm({ ...editForm, attendanceMode: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
                >
                  <option value="centro">En la consulta</option>
                  <option value="domicilio">A domicilio</option>
                  <option value="ambos">De las dos formas</option>
                </select>
              </div>
              {(editForm.attendanceMode === "domicilio" || editForm.attendanceMode === "ambos") && (
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Dirección</label>
                  <input type="text" value={editForm.homeAddress || ""} onChange={(e) => setEditForm({ ...editForm, homeAddress: e.target.value })} placeholder="Dónde se hacen las sesiones" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
                </div>
              )}
            </div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">{countryConfig(country).documentLabel}</label>
            <input type="text" value={editForm.rut || ""} onChange={(e) => setEditForm({ ...editForm, rut: formatDocument(e.target.value, country) })} placeholder={countryConfig(country).documentPlaceholder} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            {countryConfig(country).documentHint && <p className="text-[11px] text-slate-400 mt-1.5">{countryConfig(country).documentHint}</p>}
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Diagnóstico</label>
            <input type="text" value={editForm.diagnosis || ""} onChange={(e) => setEditForm({ ...editForm, diagnosis: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Motivo de consulta</label>
            <textarea rows={2} value={editForm.consultReason || ""} onChange={(e) => setEditForm({ ...editForm, consultReason: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tutor / Apoderado</label>
              <input type="text" value={editForm.guardian || ""} onChange={(e) => setEditForm({ ...editForm, guardian: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Teléfono tutor</label>
              <input type="tel" value={editForm.guardianPhone || ""} onChange={(e) => setEditForm({ ...editForm, guardianPhone: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Correo del tutor</label>
              <input type="email" value={editForm.guardianEmail || ""} onChange={(e) => setEditForm({ ...editForm, guardianEmail: e.target.value })} placeholder="correo@email.com" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
              <p className="text-[11px] text-slate-400 mt-1.5">Recibe el aviso al agendar y los recordatorios de cada sesión.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Cobertura de salud</label>
              <select value={editForm.prevision || ""} onChange={(e) => setEditForm({ ...editForm, prevision: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white">
                <option value="">Sin especificar</option>
                <option value="Pública">Pública</option>
                <option value="Privada">Privada</option>
                <option value="Particular">Particular</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Entidad</label>
              <input type="text" value={editForm.coverageEntity || ""} onChange={(e) => setEditForm({ ...editForm, coverageEntity: e.target.value })} placeholder="Fonasa, Isapre, OSDE, EPS..." className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="text-sm font-semibold text-slate-700">Valor sesión</label>
                <div className="flex items-center gap-1.5">
                  {currencySaved && <span className="text-[11px] font-semibold text-emerald-600">Moneda guardada</span>}
                  <select
                    value={currency}
                    onChange={(e) => changeCurrency(e.target.value)}
                    title="Moneda de toda tu consulta"
                    className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <input type="number" min={0} value={editForm.sessionValue || ""} disabled={!puedeDinero} onChange={(e) => setEditForm({ ...editForm, sessionValue: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all disabled:bg-slate-50 disabled:text-slate-400" />
              <p className="text-[11px] text-slate-400 mt-1.5">{puedeDinero ? `${CURRENCY_LABELS[currency]} · es la moneda de toda tu consulta` : "El valor lo define la Administradora del Centro"}</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Estado</label>
            <select value={editForm.status || "activo"} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white">
              <option value="activo">Activo</option>
              <option value="evaluacion">En Evaluación</option>
              <option value="alta">Alta</option>
              <option value="no_continua">No continúa</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Teléfono</label>
              <input type="tel" value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Email</label>
              <input type="email" value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
          </div>
        </div>
      </Modal>

      {/* Profile Modal */}
      <Modal
        open={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        title="Perfil del Usuario"
        maxWidth="max-w-lg"
      >
        {selectedPatient && (
          <div className="space-y-5">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 ${selectedPatient.color.startsWith('#') ? '' : `bg-gradient-to-br ${selectedPatient.color}`} rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg`}
                style={selectedPatient.color.startsWith('#') ? { background: selectedPatient.color } : {}}
              >
                {selectedPatient.initials}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selectedPatient.name}</h3>
                <select
                  value={selectedPatient.status}
                  onChange={async (e) => {
                    const status = e.target.value;
                    setSelectedPatient((prev) => (prev ? { ...prev, status } : prev));
                    setPatients((prev) => prev.map((x) => (x.id === selectedPatient.id ? { ...x, status } : x)));
                    await fetch(`/api/patients/${selectedPatient.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status }),
                    });
                  }}
                  className={`mt-1 text-xs font-semibold px-2.5 py-1 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${statusConfig[selectedPatient.status]?.cls ?? "bg-slate-100 text-slate-600"}`}
                  title="Cambiar estado del usuario"
                >
                  <option value="activo">Activo</option>
                  <option value="evaluacion">En Evaluación</option>
                  <option value="alta">Alta</option>
                  <option value="no_continua">No continúa</option>
                </select>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: User, label: "Edad", value: `${displayAge(selectedPatient)} años${selectedPatient.birthDate ? ` (${selectedPatient.birthDate.split("-").reverse().join("-")})` : ""}` },
                { icon: Activity, label: "Terapeuta", value: selectedPatient.therapist },
                { icon: ClipboardList, label: "Diagnóstico", value: selectedPatient.diagnosis },
                { icon: Hash, label: "Sesiones", value: `${selectedPatient.sessions} realizadas` },
                { icon: Calendar, label: "Próxima sesión", value: (() => {
                  const next = upcomingFor(selectedPatient.id, appointments)[0];
                  return next ? `${next.date.split("-").reverse().join("-")} · ${next.time} hrs` : "Sin cita agendada";
                })() },
                ...(selectedPatient.guardian ? [{ icon: User, label: "Tutor / Apoderado", value: `${selectedPatient.guardian}${selectedPatient.guardianPhone ? ` · ${selectedPatient.guardianPhone}` : ""}` }] : []),
                ...(selectedPatient.prevision || selectedPatient.coverageEntity ? [{ icon: ClipboardList, label: "Cobertura de salud", value: [selectedPatient.prevision, selectedPatient.coverageEntity].filter(Boolean).join(" · ") }] : []),
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3.5 h-3.5 text-violet-500" />
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">{value}</p>
                </div>
              ))}
            </div>

            {selectedPatient.consultReason && (
              <div className="bg-slate-50 rounded-xl p-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Motivo de consulta</span>
                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{selectedPatient.consultReason}</p>
              </div>
            )}

            {/* Adherencia y pagos */}
            {sessionRecords.length > 0 && (() => {
              const asistidas = sessionRecords.filter((s) => s.attended).length;
              const adherencia = Math.round((asistidas / sessionRecords.length) * 100);
              const pendientesPago = sessionRecords.filter((s) => s.attended && !s.paid).length;
              const valor = selectedPatient.sessionValue || 0;
              return (
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-xl p-3 ${adherencia >= 80 ? "bg-emerald-50" : adherencia >= 50 ? "bg-amber-50" : "bg-rose-50"}`}>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Adherencia</span>
                    <p className={`text-lg font-bold ${adherencia >= 80 ? "text-emerald-600" : adherencia >= 50 ? "text-amber-600" : "text-rose-600"}`}>{adherencia}%</p>
                    <p className="text-[11px] text-slate-400">{asistidas} de {sessionRecords.length} sesiones</p>
                  </div>
                  <div className={`rounded-xl p-3 ${pendientesPago === 0 ? "bg-emerald-50" : "bg-amber-50"}`}>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Pagos</span>
                    <p className={`text-lg font-bold ${pendientesPago === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {pendientesPago === 0 ? "Al día" : `${pendientesPago} pendiente${pendientesPago > 1 ? "s" : ""}`}
                    </p>
                    {valor > 0 && pendientesPago > 0 && <p className="text-[11px] text-slate-400">{formatMoney(pendientesPago * valor, currency)} por cobrar</p>}
                  </div>
                </div>
              );
            })()}

            {/* Objetivos terapéuticos */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-violet-500" />
                <h4 className="text-sm font-bold text-slate-700">Objetivos terapéuticos</h4>
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addObjective(); }}
                  placeholder="Nuevo objetivo (ej. Tolerar 3 texturas nuevas)..."
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
                <button onClick={addObjective} disabled={savingObjective || !newObjective.trim()} className="px-3 bg-violet-50 hover:bg-violet-100 text-violet-600 rounded-lg disabled:opacity-50 transition-all">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {objectives.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5 text-center">Sin objetivos definidos aún</p>
              ) : (
                <div className="space-y-2">
                  {objectives.map((obj) => (
                    <div key={obj.id} className="bg-slate-50 rounded-xl p-3 group">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className={`text-xs font-semibold ${obj.status === "logrado" ? "text-emerald-600 line-through" : "text-slate-700"}`}>{obj.title}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          {obj.status !== "logrado" ? (
                            <button onClick={() => updateObjective(obj, { status: "logrado", progress: 100 })} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">✓ Logrado</button>
                          ) : (
                            <button onClick={() => updateObjective(obj, { status: "activo", progress: obj.progress === 100 ? 75 : obj.progress })} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">Reabrir</button>
                          )}
                          <button onClick={() => deleteObjective(obj.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={obj.progress}
                          onChange={(e) => updateObjective(obj, { progress: Number(e.target.value), ...(Number(e.target.value) === 100 ? { status: "logrado" } : { status: "activo" }) })}
                          className="flex-1 accent-violet-500 h-1.5"
                        />
                        <span className="text-[11px] font-bold text-slate-500 w-9 text-right">{obj.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(selectedPatient.attendanceMode === "domicilio" || selectedPatient.attendanceMode === "ambos") && selectedPatient.homeAddress && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-amber-900">
                      {selectedPatient.attendanceMode === "ambos" ? "También se atiende a domicilio" : "Se atiende a domicilio"}
                    </p>
                    <p className="text-xs text-amber-800 truncate">{selectedPatient.homeAddress}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Fichas: información base del usuario, separada de los documentos */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="w-4 h-4 text-violet-500" />
                <h4 className="text-sm font-bold text-slate-700">Fichas</h4>
                {templates.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => { const t = templates.find((x) => String(x.id) === e.target.value); if (t) abrirFichaNueva(t); }}
                    className="ml-auto text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  >
                    <option value="">+ Llenar una ficha...</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
              </div>

              {templates.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5">
                  Crea tus formularios en <strong>Plantillas</strong> y podrás llenarlos aquí para cada usuario.
                </p>
              ) : patientForms.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5">
                  Sin fichas llenadas. Elige una plantilla arriba para completarla, o imprímela en blanco.
                </p>
              ) : (
                <div className="space-y-2">
                  {patientForms.map((r) => (
                    <div key={r.id} className="border border-violet-100 bg-violet-50/50 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-700 truncate flex-1">{r.title || r.template.name}</p>
                        <span className="text-[10px] text-slate-400">{new Date(r.updatedAt).toLocaleDateString("es-CL")}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <button onClick={() => abrirFichaGuardada(r)} className="text-[11px] font-semibold text-violet-700 bg-white border border-violet-200 px-2 py-0.5 rounded-lg hover:bg-violet-100 transition-colors">Ver / editar</button>
                        <button onClick={() => imprimirFicha(r.title || r.template.name, r.template.sections, r.answers)} className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-lg hover:bg-slate-100 transition-colors">Imprimir</button>
                        <button onClick={() => borrarFicha(r.id)} className="text-[11px] font-semibold text-rose-600 bg-white border border-rose-200 px-2 py-0.5 rounded-lg hover:bg-rose-50 transition-colors ml-auto">Borrar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {templates.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {templates.map((t) => (
                    <button key={t.id} onClick={() => imprimirFicha(t.name, t.sections, null)} className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg hover:bg-slate-100 transition-colors">
                      Imprimir «{t.name}» en blanco
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Documentos que la familia aceptó en línea: consentimiento, compromiso, políticas */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileSignature className="w-4 h-4 text-violet-500" />
                <h4 className="text-sm font-bold text-slate-700">Acuerdos con la familia</h4>
                {consentTemplates.length > 0 && (
                  <select
                    value=""
                    disabled={sendingConsent}
                    onChange={(e) => { if (e.target.value) enviarConsent(Number(e.target.value)); }}
                    className="ml-auto text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50"
                  >
                    <option value="">{sendingConsent ? "Enviando..." : "+ Enviar documento..."}</option>
                    {consentTemplates.filter((t) => t.body.trim()).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
              </div>
              {consentTemplates.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5">
                  Crea tus documentos (consentimiento, compromiso, políticas) en <strong>Plantillas</strong> y envíalos desde aquí para que la familia los acepte en línea.
                </p>
              ) : consents.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5">
                  Nada enviado todavía. Elige un documento arriba: la familia recibe un correo, lo lee y lo acepta con un clic.
                </p>
              ) : (
                <div className="space-y-2">
                  {consents.map((c) => (
                    <div key={c.id} className={`border rounded-xl px-3 py-2.5 ${c.acceptedAt ? "border-emerald-100 bg-emerald-50/50" : "border-amber-100 bg-amber-50/40"}`}>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-700 truncate flex-1">{c.title}</p>
                        {c.acceptedAt ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Aceptado</span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 flex items-center gap-1"><Send className="w-3 h-3" /> Pendiente</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {c.acceptedAt
                          ? `${c.acceptedName} lo aceptó el ${new Date(c.acceptedAt).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })}${c.documentId ? " · guardado en Documentos" : ""}`
                          : `Enviado a ${c.sentTo} el ${new Date(c.sentAt).toLocaleDateString("es-CL")}`}
                      </p>
                      {!c.acceptedAt && (
                        <button onClick={() => retirarConsent(c.id)} className="text-[11px] font-semibold text-rose-600 mt-1.5 hover:underline">Retirar</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notas internas del equipo: nunca salen en un informe */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-slate-400" />
                <h4 className="text-sm font-bold text-slate-700">Notas internas</h4>
                <span className="text-[11px] text-slate-400">solo para el equipo</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") agregarNota(); }}
                  placeholder="Observación de supervisión, acuerdo de equipo..."
                  className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                />
                <button onClick={agregarNota} disabled={!newNote.trim()} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors shrink-0">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {notes.length === 0 ? (
                <p className="text-[11px] text-slate-400 mt-2">Nunca aparecen en los informes ni las ve la familia.</p>
              ) : (
                <div className="space-y-2 mt-2">
                  {notes.map((n) => (
                    <div key={n.id} className="group bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-2">
                      <p className="text-xs text-slate-700 whitespace-pre-wrap">{n.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400">{n.authorName} · {new Date(n.createdAt).toLocaleDateString("es-CL")}</span>
                        <button onClick={() => borrarNota(n.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Paquete de sesiones vigente */}
            {patientPackages.filter((pk) => pk.status !== "cerrado").length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-violet-500" />
                  <h4 className="text-sm font-bold text-slate-700">Paquetes de sesiones</h4>
                </div>
                <div className="space-y-2">
                  {patientPackages.filter((pk) => pk.status !== "cerrado").map((pk) => (
                    <div key={pk.id} className={`rounded-xl border px-3 py-2.5 ${pk.expired && pk.remaining > 0 ? "border-rose-200 bg-rose-50/60" : pk.endingSoon ? "border-amber-200 bg-amber-50/60" : "border-violet-100 bg-violet-50/60"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-700 truncate">{pk.name}</p>
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${pk.paid ? "text-emerald-600 bg-emerald-50" : "text-slate-500 bg-white"}`}>
                          {pk.paid ? "Pagado" : "Sin pagar"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pk.expired ? "bg-rose-500" : pk.endingSoon ? "bg-amber-500" : "bg-violet-500"}`} style={{ width: `${Math.min(100, Math.round((pk.usedSessions / pk.totalSessions) * 100))}%` }} />
                        </div>
                        <p className="text-[11px] font-semibold text-slate-600 shrink-0">quedan {pk.remaining} de {pk.totalSessions}</p>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {pk.expired && pk.remaining > 0
                          ? `Venció el ${pk.expiresAt} con ${pk.remaining} ${pk.remaining === 1 ? "sesión sin usar" : "sesiones sin usar"}`
                          : pk.remaining === 0
                            ? "Paquete agotado: toca renovar"
                            : pk.expiresAt ? `Vence el ${pk.expiresAt}` : "Sin vencimiento"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Próximas sesiones agendadas en el calendario */}
            {(() => {
              const next = upcomingFor(selectedPatient.id, appointments);
              if (next.length === 0) return null;
              return (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-violet-500" />
                    <h4 className="text-sm font-bold text-slate-700">Próximas sesiones</h4>
                    <span className="text-[11px] text-slate-400">({next.length} agendada{next.length > 1 ? "s" : ""})</span>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {next.slice(0, 10).map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-2 bg-violet-50/60 border border-violet-100 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-slate-700">{a.date.split("-").reverse().join("-")}</span>
                          <span className="text-xs text-slate-500">{a.time} hrs</span>
                        </div>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white text-violet-600 border border-violet-200 capitalize">{a.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Historial de sesiones */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <NotebookPen className="w-4 h-4 text-violet-500" />
                  <h4 className="text-sm font-bold text-slate-700">Historial de sesiones</h4>
                </div>
                <div className="flex items-center gap-1.5">
                {sessionRecords.length > 0 && (
                  <button onClick={printEvolutions} className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-violet-700 bg-slate-100 hover:bg-violet-50 px-2.5 py-1.5 rounded-lg transition-all" title="Descargar todas las evoluciones">
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                )}
                <button
                  onClick={() => { setShowAddSession(!showAddSession); setNewSession({ date: new Date().toISOString().slice(0, 10), notes: "", duration: 45, attended: true, paid: false }); }}
                  className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-2.5 py-1.5 rounded-lg transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Registrar sesión
                </button>
                </div>
              </div>

              {showAddSession && (
                <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-3 mb-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Fecha (puede ser pasada)</label>
                      <input type="date" value={newSession.date} onChange={(e) => setNewSession({ ...newSession, date: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Duración</label>
                      <select value={newSession.duration} onChange={(e) => setNewSession({ ...newSession, duration: Number(e.target.value) })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all">
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>60 min</option>
                        <option value={90}>90 min</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Notas de evolución</label>
                    <textarea value={newSession.notes} onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })} rows={3} placeholder="Qué se trabajó, avances, observaciones..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all resize-none" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={newSession.attended} onChange={(e) => setNewSession({ ...newSession, attended: e.target.checked })} className="accent-violet-500" /> Asistió
                    </label>
                    {puedeDinero && (
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={newSession.paid} onChange={(e) => setNewSession({ ...newSession, paid: e.target.checked })} className="accent-emerald-500" /> Pagada
                      </label>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addSession} disabled={savingSession || !newSession.date} className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold py-2 rounded-lg hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 transition-all">
                      {savingSession ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Guardar
                    </button>
                    <button onClick={() => setShowAddSession(false)} className="px-4 text-sm font-medium text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg transition-all">Cancelar</button>
                  </div>
                </div>
              )}

              {sessionsLoading ? (
                <div className="flex items-center justify-center py-4 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /></div>
              ) : sessionRecords.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-3 text-center">Sin sesiones registradas aún. Registra sesiones pasadas o nuevas para construir el historial clínico.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {sessionRecords.map((s) => (
                    editingSession?.id === s.id ? (
                      <div key={s.id} className="bg-violet-50/60 border border-violet-100 rounded-xl p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" value={editingSession.date} onChange={(e) => setEditingSession({ ...editingSession, date: e.target.value })} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                          <select value={editingSession.duration} onChange={(e) => setEditingSession({ ...editingSession, duration: Number(e.target.value) })} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30">
                            <option value={30}>30 min</option>
                            <option value={45}>45 min</option>
                            <option value={60}>60 min</option>
                            <option value={90}>90 min</option>
                          </select>
                        </div>
                        <textarea value={editingSession.notes} onChange={(e) => setEditingSession({ ...editingSession, notes: e.target.value })} rows={3} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none" />
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={editingSession.attended} onChange={(e) => setEditingSession({ ...editingSession, attended: e.target.checked })} className="accent-violet-500" /> Asistió
                          </label>
                          {puedeDinero && (
                            <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                              <input type="checkbox" checked={editingSession.paid} onChange={(e) => setEditingSession({ ...editingSession, paid: e.target.checked })} className="accent-emerald-500" /> Pagada
                            </label>
                          )}
                          <div className="flex-1" />
                          <button onClick={saveEditSession} className="text-[11px] font-semibold px-2 py-1 rounded-md bg-violet-500 text-white hover:bg-violet-600 transition-colors">Guardar</button>
                          <button onClick={() => setEditingSession(null)} className="text-[11px] font-medium px-2 py-1 rounded-md text-slate-500 bg-white border border-slate-200 hover:text-slate-700 transition-colors">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                    <div key={s.id} className="bg-slate-50 rounded-xl p-3 group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <Calendar className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-600">{s.date.split("-").reverse().join("-")}</span>
                          <span className="text-[11px] text-slate-400">· {s.duration} min</span>
                          {!s.attended && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-600">No asistió</span>}
                          {!s.confirmed && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">Pendiente: confirmar asistencia, pago y evolución</span>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {s.attended && (
                            <button onClick={() => { if (puedeDinero) toggleSessionPaid(s); }} disabled={!puedeDinero} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md transition-colors flex items-center gap-0.5 disabled:cursor-default ${s.paid ? "bg-emerald-100 text-emerald-600" : `bg-amber-100 text-amber-600 ${puedeDinero ? "hover:bg-amber-200" : ""}`}`} title={!puedeDinero ? "Los pagos los registra la Administradora" : s.paid ? "Marcar como no pagada" : "Marcar como pagada"}>
                              <DollarSign className="w-2.5 h-2.5" /> {s.paid ? "Pagada" : "Pendiente"}
                            </button>
                          )}
                          <button onClick={() => setEditingSession(s)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-violet-500 transition-all" title="Editar sesión">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteSession(s.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {s.notes && <p className="text-xs text-slate-600 whitespace-pre-wrap">{s.notes}</p>}
                      {!s.confirmed && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                          <span className="text-[11px] text-slate-500">Entró sola desde el calendario. ¿Asistió?</span>
                          <button onClick={() => confirmSession(s, true)} className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">✓ Asistió</button>
                          <button onClick={() => confirmSession(s, false)} className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">✗ No asistió</button>
                        </div>
                      )}
                    </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Documentos asociados a este usuario */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-violet-500" />
                  <h4 className="text-sm font-bold text-slate-700">Documentos</h4>
                </div>
                <a href="/dashboard/biblioteca" className="text-xs font-semibold text-violet-600 hover:text-violet-700">
                  Ir a Biblioteca
                </a>
              </div>
              {patientDocs.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5 text-center">
                  Sin documentos asociados. En Biblioteca puedes asociar archivos a este usuario.
                </p>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {patientDocs.map((d) => (
                    <button
                      key={d.id}
                      onClick={async () => {
                        const res = await fetch(`/api/documents/${d.id}`);
                        if (res.ok) { const { url } = await res.json(); window.open(url, "_blank"); }
                      }}
                      className="w-full flex items-center gap-3 bg-slate-50 hover:bg-violet-50 rounded-xl p-2.5 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center shrink-0">
                        <ClipboardList className="w-4 h-4 text-violet-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-700 truncate">{d.name}</p>
                        <p className="text-[11px] text-slate-400">{d.category} · {d.size} · {new Date(d.createdAt).toLocaleDateString("es-CL")}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <a
                href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(selectedPatient.email || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  selectedPatient.email
                    ? 'border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300'
                    : 'border-slate-200 text-slate-400 cursor-not-allowed opacity-50 pointer-events-none'
                }`}
              >
                <Mail className="w-4 h-4" /> Gmail
              </a>
              <a
                href={`https://wa.me/${(selectedPatient.phone || '').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  selectedPatient.phone
                    ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'
                    : 'border-slate-200 text-slate-400 cursor-not-allowed opacity-50 pointer-events-none'
                }`}
              >
                <Phone className="w-4 h-4" /> WhatsApp
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* New Patient Modal */}
      <Modal
        open={showNewPatient}
        onClose={() => setShowNewPatient(false)}
        title="Nuevo Usuario"
        footer={
          <button onClick={addPatient} disabled={!newPatient.name.trim() || !newPatient.diagnosis.trim()} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30">
            Registrar Usuario
          </button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nombre *</label>
              <input autoFocus type="text" value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} placeholder="Nombre completo" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Fecha de nacimiento</label>
              <input type="date" value={newPatient.birthDate} onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
              <p className="text-[11px] text-slate-400 mt-1">La edad se calcula sola{newPatient.birthDate ? `: ${displayAge(newPatient)} años` : ""}</p>
            </div>
          </div>
          <div>
            {centerRole === "administradora" && therapists.length > 1 && (
              <div className="mb-4">
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Terapeuta a cargo</label>
                <select
                  value={newPatient.therapistEmail}
                  onChange={(e) => setNewPatient({ ...newPatient, therapistEmail: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
                >
                  <option value="">Yo</option>
                  {therapists.filter((t) => t.role !== "administradora").map((t) => (
                    <option key={t.email} value={t.email}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Dónde se atiende</label>
                <select
                  value={newPatient.attendanceMode}
                  onChange={(e) => setNewPatient({ ...newPatient, attendanceMode: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
                >
                  <option value="centro">En la consulta</option>
                  <option value="domicilio">A domicilio</option>
                  <option value="ambos">De las dos formas</option>
                </select>
              </div>
              {(newPatient.attendanceMode === "domicilio" || newPatient.attendanceMode === "ambos") && (
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Dirección</label>
                  <input type="text" value={newPatient.homeAddress} onChange={(e) => setNewPatient({ ...newPatient, homeAddress: e.target.value })} placeholder="Dónde se hacen las sesiones" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
                </div>
              )}
            </div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">{countryConfig(country).documentLabel}</label>
            <input type="text" value={newPatient.rut} onChange={(e) => setNewPatient({ ...newPatient, rut: formatDocument(e.target.value, country) })} placeholder={countryConfig(country).documentPlaceholder} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            {countryConfig(country).documentHint && <p className="text-[11px] text-slate-400 mt-1.5">{countryConfig(country).documentHint}</p>}
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Diagnóstico *</label>
            <input type="text" value={newPatient.diagnosis} onChange={(e) => setNewPatient({ ...newPatient, diagnosis: e.target.value })} placeholder="Diagnóstico principal" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Motivo de consulta</label>
            <textarea rows={2} value={newPatient.consultReason} onChange={(e) => setNewPatient({ ...newPatient, consultReason: e.target.value })} placeholder="Por qué consulta, quién deriva..." className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all resize-none" />
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={selfContact} onChange={(e) => setSelfContact(e.target.checked)} className="accent-violet-500" />
              El paciente es su propio contacto (adulto sin tutor)
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {!selfContact && (
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tutor / Apoderado</label>
                <input type="text" value={newPatient.guardian} onChange={(e) => setNewPatient({ ...newPatient, guardian: e.target.value })} placeholder="Nombre del tutor" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
              </div>
            )}
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Teléfono / WhatsApp</label>
              <input type="tel" value={newPatient.guardianPhone} onChange={(e) => setNewPatient({ ...newPatient, guardianPhone: e.target.value })} placeholder="+56912345678" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div className={selfContact ? "" : "col-span-2"}>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Correo</label>
              <input type="email" value={newPatient.guardianEmail} onChange={(e) => setNewPatient({ ...newPatient, guardianEmail: e.target.value })} placeholder="correo@email.com" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
              <p className="text-[11px] text-slate-400 mt-1.5">Recibe el aviso al agendar la cita y el recordatorio 24 horas antes.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Cobertura de salud</label>
              <select value={newPatient.prevision} onChange={(e) => setNewPatient({ ...newPatient, prevision: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white">
                <option value="">Sin especificar</option>
                <option value="Pública">Pública</option>
                <option value="Privada">Privada</option>
                <option value="Particular">Particular</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Entidad</label>
              <input type="text" value={newPatient.coverageEntity} onChange={(e) => setNewPatient({ ...newPatient, coverageEntity: e.target.value })} placeholder="Fonasa, Isapre, OSDE, EPS..." className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="text-sm font-semibold text-slate-700">Valor sesión</label>
                <div className="flex items-center gap-1.5">
                  {currencySaved && <span className="text-[11px] font-semibold text-emerald-600">Moneda guardada</span>}
                  <select
                    value={currency}
                    onChange={(e) => changeCurrency(e.target.value)}
                    title="Moneda de toda tu consulta"
                    className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <input type="number" min={0} value={newPatient.sessionValue || ""} disabled={!puedeDinero} onChange={(e) => setNewPatient({ ...newPatient, sessionValue: parseInt(e.target.value) || 0 })} placeholder={puedeDinero ? "Ej. 35000" : "Lo define la Administradora"} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all disabled:bg-slate-50 disabled:text-slate-400" />
              <p className="text-[11px] text-slate-400 mt-1.5">{puedeDinero ? `${CURRENCY_LABELS[currency]} · es la moneda de toda tu consulta` : "El valor lo define la Administradora del Centro"}</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Estado</label>
            <select value={newPatient.status} onChange={(e) => setNewPatient({ ...newPatient, status: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white">
              <option value="activo">Activo</option>
              <option value="evaluacion">En Evaluación</option>
              <option value="alta">Alta</option>
              <option value="no_continua">No continúa</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Llenar o ver una ficha */}
      <Modal
        open={!!(fillingTemplate || fillingResponse)}
        onClose={() => { setFillingTemplate(null); setFillingResponse(null); }}
        title={fillingResponse ? (fillingResponse.title || fillingResponse.template.name) : fillingTemplate?.name ?? ""}
        subtitle={selectedPatient?.name}
        maxWidth="max-w-2xl"
        footer={
          <button onClick={guardarFicha} disabled={savingForm} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/30">
            {savingForm ? "Guardando..." : "Guardar ficha"}
          </button>
        }
      >
        <FormFiller
          sections={fillingResponse ? fillingResponse.template.sections : fillingTemplate?.sections ?? []}
          answers={formAnswers}
          onChange={(id, value) => setFormAnswers((prev) => ({ ...prev, [id]: value }))}
        />
      </Modal>
    </div>
  );
}
