"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  LayoutDashboard,
  Calendar,
  Users,
  CheckSquare,
  Bot,
  Kanban,
  BookOpen,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard/inicio", icon: LayoutDashboard, label: "Inicio" },
  { href: "/dashboard/calendario", icon: Calendar, label: "Calendario" },
  { href: "/dashboard/usuarios", icon: Users, label: "Usuarios" },
  { href: "/dashboard/tareas", icon: CheckSquare, label: "Tareas" },
  { href: "/dashboard/asistentes", icon: Bot, label: "Asistentes IA" },
  { href: "/dashboard/pipeline", icon: Kanban, label: "Pipeline" },
  { href: "/dashboard/biblioteca", icon: BookOpen, label: "Biblioteca" },
  { href: "/dashboard/recordatorios", icon: Bell, label: "Recordatorios" },
  { href: "/dashboard/configuracion", icon: Settings, label: "Configuración" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative flex flex-col h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-800/60 shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800/60">
        <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="font-bold text-white text-lg tracking-tight whitespace-nowrap overflow-hidden"
            >
              TOdo
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: collapsed ? 0 : 2 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                  active
                    ? "bg-gradient-to-r from-violet-500/20 to-purple-500/10 text-violet-300"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gradient-to-b from-violet-400 to-purple-500 rounded-full"
                  />
                )}
                <item.icon
                  className={cn(
                    "w-5 h-5 shrink-0 transition-colors",
                    active ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300"
                  )}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="p-3 border-t border-slate-800/60">
        <div className={cn("flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer", collapsed && "justify-center")}>
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
            JP
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <p className="text-sm font-medium text-slate-200 truncate">Josefina Pizarro</p>
                <p className="text-xs text-slate-500 truncate">Terapeuta Ocupacional</p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!collapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-slate-600 hover:text-slate-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all z-10 shadow-lg"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </motion.aside>
  );
}
