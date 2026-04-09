"use client";

import { Bell, Search, ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const pageLabels: Record<string, { title: string; subtitle: string }> = {
  "/dashboard/inicio": { title: "Inicio", subtitle: "Resumen de tu práctica clínica" },
  "/dashboard/calendario": { title: "Calendario", subtitle: "Gestión de citas y eventos" },
  "/dashboard/usuarios": { title: "Usuarios", subtitle: "Gestión de pacientes y profesionales" },
  "/dashboard/tareas": { title: "Tareas", subtitle: "Seguimiento de actividades pendientes" },
  "/dashboard/asistentes": { title: "Asistentes Virtuales", subtitle: "Herramientas de inteligencia artificial" },
  "/dashboard/pipeline": { title: "Pipeline de Casos", subtitle: "Vista Kanban del proceso clínico" },
  "/dashboard/biblioteca": { title: "Biblioteca de Recursos", subtitle: "Documentos y materiales terapéuticos" },
  "/dashboard/recordatorios": { title: "Recordatorios", subtitle: "Notificaciones y alertas futuras" },
  "/dashboard/configuracion": { title: "Configuración", subtitle: "Perfil y preferencias de cuenta" },
};

export default function Header() {
  const pathname = usePathname();
  const page = pageLabels[pathname] || { title: "TOdo", subtitle: "" };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200/60 sticky top-0 z-20">
      {/* Page title */}
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <h1 className="text-lg font-bold text-slate-800">{page.title}</h1>
        <p className="text-xs text-slate-500">{page.subtitle}</p>
      </motion.div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100 hover:bg-slate-200 rounded-xl px-3 py-2 transition-colors cursor-pointer group">
          <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          <span className="text-sm text-slate-400 pr-6">Buscar...</span>
          <kbd className="text-[10px] bg-white border border-slate-200 text-slate-400 rounded px-1.5 py-0.5 font-mono">
            ⌘K
          </kbd>
        </div>

        {/* Notifications */}
        <button className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors group">
          <Bell className="w-5 h-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full ring-2 ring-white" />
        </button>

        {/* User */}
        <button className="flex items-center gap-2 pl-1 pr-2 py-1 hover:bg-slate-100 rounded-xl transition-colors group">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
            JP
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold text-slate-700 leading-tight">Josefina P.</p>
            <p className="text-[11px] text-slate-400 leading-tight">Terapeuta</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </button>
      </div>
    </header>
  );
}
