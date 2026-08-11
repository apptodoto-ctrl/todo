"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Camera, Save, Eye, EyeOff, Shield, AlertTriangle, User, Lock, Upload, Loader2, Download } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

const tabs = [
  { id: "perfil", label: "Perfil", icon: User },
  { id: "seguridad", label: "Seguridad", icon: Shield },
  { id: "peligro", label: "Zona de Peligro", icon: AlertTriangle },
];

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState("perfil");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [profile, setProfile] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    especialidad: "Terapeuta Ocupacional",
    email: "",
  });

  const [passwords, setPasswords] = useState({ current: "", nueva: "", confirm: "" });

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((u) => {
        if (!u?.email) return;
        const parts = (u.name ?? "").split(" ");
        setProfile({
          nombre: parts[0] ?? "",
          apellido: parts.slice(1).join(" ") ?? "",
          telefono: u.phone ?? "",
          especialidad: u.specialty ?? "Terapeuta Ocupacional",
          email: u.email,
        });
      })
      .catch(() => {});
  }, [session]);

  // Avatar persisted locally per user
  useEffect(() => {
    if (!session?.user?.email) return;
    const key = `profileAvatar_${session.user.email}`;
    const stored = localStorage.getItem(key);
    if (stored) setAvatarUrl(stored);
  }, [session?.user?.email]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.email) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setAvatarUrl(base64);
      localStorage.setItem(`profileAvatar_${session.user!.email}`, base64);
    };
    reader.readAsDataURL(file);
  };

  const showSaved = (msg: string) => {
    setSaved(msg);
    setError("");
    setTimeout(() => setSaved(""), 2500);
  };

  const showError = (msg: string) => {
    setError(msg);
    setSaved("");
    setTimeout(() => setError(""), 4000);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${profile.nombre} ${profile.apellido}`.trim(),
          phone: profile.telefono,
          specialty: profile.especialidad,
        }),
      });
      const data = await res.json();
      if (!res.ok) showError(data.error || "No se pudo actualizar el perfil");
      else showSaved("Perfil actualizado correctamente. El nombre en la barra lateral se actualiza al volver a iniciar sesión.");
    } catch {
      showError("Error de conexión");
    }
    setSavingProfile(false);
  };

  const savePassword = async () => {
    if (passwords.nueva.length < 6) { showError("La nueva contraseña debe tener al menos 6 caracteres"); return; }
    if (passwords.nueva !== passwords.confirm) { showError("Las contraseñas nuevas no coinciden"); return; }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/users/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.nueva }),
      });
      const data = await res.json();
      if (!res.ok) showError(data.error || "No se pudo cambiar la contraseña");
      else {
        showSaved("Contraseña actualizada correctamente");
        setPasswords({ current: "", nueva: "", confirm: "" });
      }
    } catch {
      showError("Error de conexión");
    }
    setSavingPassword(false);
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/users/export");
      if (!res.ok) { showError("No se pudo exportar"); setExporting(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `todo-therapy-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showSaved("Datos exportados");
    } catch {
      showError("Error de conexión");
    }
    setExporting(false);
  };

  const deleteAccount = async () => {
    const password = prompt("Esta acción eliminará tu cuenta y TODOS tus datos (pacientes, sesiones, tareas, citas, documentos) de forma permanente.\n\nEscribe tu contraseña para confirmar:");
    if (!password) return;
    if (!confirm("¿Estás completamente seguro? Esta acción NO se puede deshacer.")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { showError(data.error || "No se pudo eliminar la cuenta"); setDeleting(false); return; }
      await signOut({ callbackUrl: "/auth" });
    } catch {
      showError("Error de conexión");
      setDeleting(false);
    }
  };

  const pwFields = [
    { key: "current" as const, label: "Contraseña actual", show: showCurrentPw, toggle: () => setShowCurrentPw(!showCurrentPw) },
    { key: "nueva" as const, label: "Nueva contraseña", show: showNewPw, toggle: () => setShowNewPw(!showNewPw) },
    { key: "confirm" as const, label: "Confirmar nueva contraseña", show: showConfirmPw, toggle: () => setShowConfirmPw(!showConfirmPw) },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Toasts */}
      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-6 right-6 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center gap-2 max-w-sm"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          {saved}
        </motion.div>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-6 right-6 z-50 bg-rose-500 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl shadow-rose-500/30 flex items-center gap-2 max-w-sm"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </motion.div>
      )}
      {/* Tab navigation */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex bg-white border border-slate-200/60 rounded-2xl p-1.5 gap-1"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t.id
                ? t.id === "peligro"
                  ? "bg-red-500 text-white shadow-md shadow-red-500/25"
                  : "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/25"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </motion.div>

      {/* Perfil */}
      {tab === "perfil" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Photo */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
            <h3 className="font-semibold text-slate-800 mb-1">Foto de Perfil</h3>
            <p className="text-xs text-slate-400 mb-5">
              Actualiza tu foto de perfil. Formatos permitidos: JPG, PNG. Tamaño máximo: 5MB.
            </p>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-violet-500/30 overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                    [profile.nombre[0], profile.apellido[0]].filter(Boolean).join("").toUpperCase() || "U"
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-violet-500 hover:bg-violet-600 text-white rounded-lg flex items-center justify-center transition-colors shadow-md cursor-pointer">
                  <Camera className="w-3.5 h-3.5" />
                  <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleImageChange} />
                </label>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-4 py-2.5 rounded-xl transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" /> Seleccionar imagen
                  <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleImageChange} />
                </label>
                <p className="text-xs text-slate-400 mt-2">JPG, PNG hasta 5MB</p>
              </div>
            </div>
          </div>

          {/* Personal info */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
            <h3 className="font-semibold text-slate-800 mb-1">Información Personal</h3>
            <p className="text-xs text-slate-400 mb-5">Actualiza tu información personal y profesional.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={profile.nombre}
                  onChange={(e) => setProfile({ ...profile, nombre: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Apellido</label>
                <input
                  type="text"
                  value={profile.apellido}
                  onChange={(e) => setProfile({ ...profile, apellido: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Teléfono</label>
                <input
                  type="tel"
                  value={profile.telefono}
                  onChange={(e) => setProfile({ ...profile, telefono: e.target.value })}
                  placeholder="Tu número de teléfono"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all placeholder-slate-300"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Especialidad</label>
                <input
                  type="text"
                  value={profile.especialidad}
                  onChange={(e) => setProfile({ ...profile, especialidad: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 mt-1.5">El email no se puede cambiar. Contacta al administrador si necesitas cambiarlo.</p>
              </div>
            </div>

            <button onClick={saveProfile} disabled={savingProfile} className="mt-6 flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/30">
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Actualizar perfil
            </button>
          </div>
        </motion.div>
      )}

      {/* Seguridad */}
      {tab === "seguridad" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200/60 p-6 space-y-5"
        >
          <div>
            <h3 className="font-semibold text-slate-800 mb-1">Cambiar Contraseña</h3>
            <p className="text-xs text-slate-400">Asegúrate de usar una contraseña segura de al menos 6 caracteres.</p>
          </div>

          {pwFields.map((field) => (
            <div key={field.label}>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">{field.label}</label>
              <div className="relative">
                <input
                  type={field.show ? "text" : "password"}
                  placeholder="••••••••"
                  value={passwords[field.key]}
                  onChange={(e) => setPasswords({ ...passwords, [field.key]: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-12 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
                <button
                  type="button"
                  onClick={field.toggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
                >
                  {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}

          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex gap-3">
            <Shield className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-violet-800">Recomendaciones de seguridad</p>
              <ul className="mt-1 space-y-0.5 text-xs text-violet-600">
                <li>• Mínimo 6 caracteres</li>
                <li>• Incluir letras mayúsculas y minúsculas</li>
                <li>• Incluir números y caracteres especiales</li>
              </ul>
            </div>
          </div>

          <button onClick={savePassword} disabled={savingPassword || !passwords.current || !passwords.nueva || !passwords.confirm} className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/30">
            {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Actualizar contraseña
          </button>
        </motion.div>
      )}

      {/* Zona de Peligro */}
      {tab === "peligro" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800 mb-1">Zona de Peligro</h3>
                <p className="text-sm text-red-600">
                  Las acciones en esta sección son irreversibles. Por favor, procede con precaución.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 flex items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-slate-800 text-sm">Exportar mis datos</h4>
              <p className="text-xs text-slate-400 mt-0.5">Descarga todos tus datos personales y de pacientes en formato JSON.</p>
            </div>
            <button
              onClick={exportData}
              disabled={exporting}
              className="shrink-0 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all whitespace-nowrap border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Exportar datos
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 flex items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-slate-800 text-sm">Eliminar cuenta permanentemente</h4>
              <p className="text-xs text-slate-400 mt-0.5">Elimina tu cuenta y todos los datos asociados. Esta acción no se puede deshacer.</p>
            </div>
            <button
              onClick={deleteAccount}
              disabled={deleting}
              className="shrink-0 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all whitespace-nowrap bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/25 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Eliminar cuenta
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
