"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Bot,
  MoreHorizontal,
  CheckSquare,
  Kanban,
  BookOpen,
  Bell,
  Crown,
  Settings,
  ShieldAlert,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react";

const primaryTabs = [
  { href: "/dashboard/inicio", icon: LayoutDashboard, label: "Inicio" },
  { href: "/dashboard/calendario", icon: Calendar, label: "Agenda" },
  { href: "/dashboard/usuarios", icon: Users, label: "Usuarios" },
  { href: "/dashboard/asistentes", icon: Bot, label: "IA" },
];

const secondaryItems = [
  { href: "/dashboard/tareas", icon: CheckSquare, label: "Tareas", tint: "from-amber-500 to-orange-500" },
  { href: "/dashboard/pipeline", icon: Kanban, label: "Pipeline", tint: "from-blue-500 to-indigo-600" },
  { href: "/dashboard/biblioteca", icon: BookOpen, label: "Biblioteca", tint: "from-pink-500 to-rose-500" },
  { href: "/dashboard/recordatorios", icon: Bell, label: "Recordatorios", tint: "from-emerald-500 to-teal-600" },
  { href: "/dashboard/plan", icon: Crown, label: "Mi plan", tint: "from-violet-500 to-purple-600" },
  { href: "/dashboard/configuracion", icon: Settings, label: "Configuración", tint: "from-slate-500 to-slate-700" },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data: session } = useSession();

  const displayName = session?.user?.name ?? "Usuario";
  const role = (session?.user as { role?: string })?.role ?? "Terapeuta";
  const isAdmin = role === "admin";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const secondaryActive =
    secondaryItems.some((i) => isActive(i.href)) || (isAdmin && isActive("/dashboard/admin"));

  // Bloquea el scroll del fondo mientras el panel está abierto
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [sheetOpen]);

  // Cierra el panel al cambiar de página
  useEffect(() => { setSheetOpen(false); }, [pathname]);

  const sheetItems = [
    ...secondaryItems,
    ...(isAdmin ? [{ href: "/dashboard/admin", icon: ShieldAlert, label: "Admin", tint: "from-violet-600 to-fuchsia-600" }] : []),
  ];

  return (
    <>
      {/* Panel "Más" */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSheetOpen(false)}
              className="lg:hidden fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 340 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => { if (info.offset.y > 90 || info.velocity.y > 700) setSheetOpen(false); }}
              className="lg:hidden fixed inset-x-0 bottom-0 z-[71] bg-white rounded-t-[28px] shadow-2xl shadow-black/30 pb-safe"
            >
              {/* Tirador */}
              <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                <div className="w-11 h-1.5 bg-slate-300 rounded-full" />
              </div>

              {/* Perfil */}
              <div className="flex items-center gap-3 px-5 py-4">
                <button
                  onClick={() => router.push("/dashboard/configuracion")}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg shadow-violet-500/25">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-slate-800 truncate">{displayName}</p>
                    <p className="text-xs text-slate-400 truncate">{isAdmin ? "Administrador" : "Terapeuta Ocupacional"}</p>
                  </div>
                </button>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 active:scale-90 transition-transform shrink-0"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Accesos */}
              <div className="grid grid-cols-3 gap-2 px-4 pb-2">
                {sheetItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSheetOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-2 py-4 px-1 rounded-2xl transition-all active:scale-95",
                        active ? "bg-violet-50 ring-1 ring-violet-200" : "active:bg-slate-50"
                      )}
                    >
                      <div className={cn("w-11 h-11 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-md", item.tint)}>
                        <item.icon className="w-5 h-5 text-white" />
                      </div>
                      <span className={cn("text-[11px] font-semibold text-center leading-tight", active ? "text-violet-700" : "text-slate-600")}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Cerrar sesión */}
              <div className="px-4 pt-2 pb-4">
                <button
                  onClick={() => signOut({ callbackUrl: "/auth" })}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-50 text-slate-600 font-semibold text-sm active:scale-[0.98] active:bg-slate-100 transition-all"
                >
                  <LogOut className="w-4 h-4" /> Cerrar sesión
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Barra de pestañas */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[60] bg-white/85 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.15)] pb-safe">
        <div className="flex items-stretch justify-around h-[4.25rem] px-1">
          {primaryTabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex-1 flex flex-col items-center justify-center gap-1 active:scale-90 transition-transform duration-150"
              >
                <span className="relative flex items-center justify-center w-12 h-8">
                  {active && (
                    <motion.span
                      layoutId="tabPill"
                      transition={{ type: "spring", damping: 26, stiffness: 380 }}
                      className="absolute inset-0 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl"
                    />
                  )}
                  <tab.icon className={cn("relative w-[22px] h-[22px] transition-colors", active ? "text-violet-600" : "text-slate-400")} />
                </span>
                <span className={cn("text-[10px] font-semibold tracking-tight transition-colors", active ? "text-violet-700" : "text-slate-400")}>
                  {tab.label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => setSheetOpen(true)}
            className="relative flex-1 flex flex-col items-center justify-center gap-1 active:scale-90 transition-transform duration-150"
          >
            <span className="relative flex items-center justify-center w-12 h-8">
              {secondaryActive && (
                <motion.span
                  layoutId="tabPill"
                  transition={{ type: "spring", damping: 26, stiffness: 380 }}
                  className="absolute inset-0 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl"
                />
              )}
              <MoreHorizontal className={cn("relative w-[22px] h-[22px] transition-colors", secondaryActive ? "text-violet-600" : "text-slate-400")} />
            </span>
            <span className={cn("text-[10px] font-semibold tracking-tight transition-colors", secondaryActive ? "text-violet-700" : "text-slate-400")}>
              Más
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
