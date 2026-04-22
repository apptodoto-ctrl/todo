"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Camera, Save, Eye, EyeOff, Shield, AlertTriangle, User, Lock, Trash2, Upload } from "lucide-react";

const tabs = [
  { id: "perfil", label: "Perfil", icon: User },
  { id: "seguridad", label: "Seguridad", icon: Shield },
  { id: "peligro", label: "Zona de Peligro", icon: AlertTriangle },
];

export default function ConfiguracionPage() {
  const [tab, setTab] = useState("perfil");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [saved, setSaved] = useState("");
  const [profile, setProfile] = useState({
    nombre: "Josefina",
    apellido: "Pizarro",
    telefono: "",
    especialidad: "Terapeuta Ocupacional",
    email: "japieaters@gmail.com",
  });

  const showSaved = (msg: string) => {
    setSaved(msg);
    setTimeout(() => setSaved(""), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Save toast */}
      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-6 right-6 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          {saved}
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
                <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-violet-500/30">
                  JP
                </div>
                <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-violet-500 hover:bg-violet-600 text-white rounded-lg flex items-center justify-center transition-colors shadow-md">
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <button className="flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-4 py-2.5 rounded-xl transition-colors">
                  <Upload className="w-4 h-4" /> Seleccionar imagen
                </button>
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
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Apellido</label>
                <input
                  type="text"
                  value={profile.apellido}
                  onChange={(e) => setProfile({ ...profile, apellido: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Teléfono</label>
                <input
                  type="tel"
                  value={profile.telefono}
                  onChange={(e) => setProfile({ ...profile, telefono: e.target.value })}
                  placeholder="Tu número de teléfono"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all placeholder-slate-300"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Especialidad</label>
                <input
                  type="text"
                  value={profile.especialidad}
                  onChange={(e) => setProfile({ ...profile, especialidad: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
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

            <button onClick={() => showSaved("Perfil actualizado correctamente")} className="mt-6 flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30">
              <Save className="w-4 h-4" /> Actualizar perfil
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
            <p className="text-xs text-slate-400">Asegúrate de usar una contraseña segura de al menos 8 caracteres.</p>
          </div>

          {[
            { label: "Contraseña actual", show: showCurrentPw, toggle: () => setShowCurrentPw(!showCurrentPw) },
            { label: "Nueva contraseña", show: showNewPw, toggle: () => setShowNewPw(!showNewPw) },
            { label: "Confirmar nueva contraseña", show: showConfirmPw, toggle: () => setShowConfirmPw(!showConfirmPw) },
          ].map((field) => (
            <div key={field.label}>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">{field.label}</label>
              <div className="relative">
                <input
                  type={field.show ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
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
                <li>• Mínimo 8 caracteres</li>
                <li>• Incluir letras mayúsculas y minúsculas</li>
                <li>• Incluir números y caracteres especiales</li>
              </ul>
            </div>
          </div>

          <button onClick={() => showSaved("Contraseña actualizada correctamente")} className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30">
            <Lock className="w-4 h-4" /> Actualizar contraseña
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

          {[
            {
              title: "Cerrar sesión en todos los dispositivos",
              description: "Cierra sesión activa en todos los dispositivos donde hayas iniciado sesión.",
              action: "Cerrar todas las sesiones",
              variant: "warning",
            },
            {
              title: "Exportar mis datos",
              description: "Descarga todos tus datos personales y de pacientes en formato JSON.",
              action: "Exportar datos",
              variant: "info",
            },
            {
              title: "Eliminar cuenta permanentemente",
              description: "Elimina tu cuenta y todos los datos asociados. Esta acción no se puede deshacer.",
              action: "Eliminar cuenta",
              variant: "danger",
            },
          ].map((action) => (
            <div
              key={action.title}
              className="bg-white rounded-2xl border border-slate-200/60 p-5 flex items-center justify-between gap-4"
            >
              <div>
                <h4 className="font-semibold text-slate-800 text-sm">{action.title}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{action.description}</p>
              </div>
              <button
                className={`shrink-0 text-sm font-medium px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                  action.variant === "danger"
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/25"
                    : action.variant === "warning"
                    ? "border border-amber-300 text-amber-700 hover:bg-amber-50"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {action.action}
              </button>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
