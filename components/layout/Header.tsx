"use client";

import { Bell, Search, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

const pageLabels: Record<string, { title: string; subtitle: string }> = {
  "/dashboard/inicio": { title: "Inicio", subtitle: "Resumen de tu práctica clínica" },
  "/dashboard/calendario": { title: "Calendario", subtitle: "Gestión de citas y eventos" },
  "/dashboard/usuarios": { title: "Usuarios", subtitle: "Gestión de usuarios y profesionales" },
  "/dashboard/tareas": { title: "Tareas", subtitle: "Seguimiento de actividades pendientes" },
  "/dashboard/asistentes": { title: "Asistentes Virtuales", subtitle: "Herramientas de inteligencia artificial" },
  "/dashboard/pipeline": { title: "Pipeline de Casos", subtitle: "Vista Kanban del proceso clínico" },
  "/dashboard/biblioteca": { title: "Biblioteca de Recursos", subtitle: "Documentos y materiales terapéuticos" },
  "/dashboard/recordatorios": { title: "Recordatorios", subtitle: "Notificaciones y alertas futuras" },
  "/dashboard/plan": { title: "Mi plan", subtitle: "Suscripción y créditos de IA" },
  "/dashboard/admin": { title: "Administración", subtitle: "Métricas globales de la plataforma" },
  "/dashboard/admin/pricing": { title: "Planes y precios", subtitle: "Catálogo editable de pricing" },
  "/dashboard/configuracion": { title: "Configuración", subtitle: "Perfil y preferencias de cuenta" },
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const page = pageLabels[pathname] || { title: "TOdo", subtitle: "" };
  const { data: session } = useSession();

  const displayName = session?.user?.name ?? "Usuario";
  const displayRole = (session?.user as { role?: string })?.role ?? "Terapeuta";
  const displayInitials = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const shortName = displayName.split(" ").slice(0, 2).join(" ");

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200/70 pt-safe">
      <div className="flex items-center justify-between gap-3 px-4 lg:px-6 h-14 lg:h-auto lg:py-4">
        {/* Título de la pantalla */}
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="min-w-0"
        >
          <h1 className="text-[17px] lg:text-lg font-bold text-slate-800 tracking-tight truncate">{page.title}</h1>
          <p className="hidden sm:block text-xs text-slate-500 truncate">{page.subtitle}</p>
        </motion.div>

        {/* Acciones */}
        <div className="flex items-center gap-1.5 lg:gap-3 shrink-0">
          {/* Buscador (solo escritorio) */}
          <div
            onClick={() => router.push("/dashboard/usuarios")}
            className="hidden lg:flex items-center gap-2 bg-slate-100 hover:bg-slate-200 rounded-xl px-3 py-2 transition-colors cursor-pointer group"
          >
            <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            <span className="text-sm text-slate-400 pr-6">Buscar...</span>
          </div>

          {/* Notificaciones */}
          <button
            onClick={() => router.push("/dashboard/recordatorios")}
            className="relative w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors active:scale-90 duration-150 group"
            aria-label="Recordatorios"
          >
            <Bell className="w-[22px] h-[22px] lg:w-5 lg:h-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
          </button>

          {/* Perfil */}
          <button
            onClick={() => router.push("/dashboard/configuracion")}
            className="flex items-center gap-2 lg:pl-1 lg:pr-2 lg:py-1 lg:hover:bg-slate-100 rounded-xl transition-all active:scale-90 lg:active:scale-100 duration-150 group"
            aria-label="Mi perfil"
          >
            <div className="w-9 h-9 lg:w-8 lg:h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl lg:rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md shadow-violet-500/20">
              {displayInitials}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-semibold text-slate-700 leading-tight">{shortName}</p>
              <p className="text-[11px] text-slate-400 leading-tight">{displayRole}</p>
            </div>
            <ChevronDown className="hidden lg:block w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>
        </div>
      </div>
    </header>
  );
}
