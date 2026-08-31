"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Users, FileText, CheckSquare, Calendar, BookOpen, ShieldAlert, Mail, Clock, Crown } from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  patientCount: number;
  taskCount: number;
}

interface Stats {
  totalUsers: number;
  totalPatients: number;
  totalTasks: number;
  totalAppointments: number;
  totalDocuments: number;
  users: UserRow[];
}

const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  admin: { label: "Admin", className: "bg-violet-100 text-violet-700 border border-violet-200" },
  user: { label: "Terapeuta", className: "bg-slate-100 text-slate-600 border border-slate-200" },
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const role = (session?.user as { role?: string })?.role;

  useEffect(() => {
    if (status === "loading") return;
    if (role !== "admin") { router.replace("/dashboard/inicio"); return; }
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status, role, router]);

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 animate-pulse" />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: "Usuarios registrados", value: stats.totalUsers, icon: Users, from: "from-violet-500", to: "to-purple-600", text: "text-violet-700", bg: "bg-violet-50" },
    { label: "Pacientes totales", value: stats.totalPatients, icon: FileText, from: "from-blue-500", to: "to-cyan-500", text: "text-blue-700", bg: "bg-blue-50" },
    { label: "Tareas creadas", value: stats.totalTasks, icon: CheckSquare, from: "from-amber-500", to: "to-orange-500", text: "text-amber-700", bg: "bg-amber-50" },
    { label: "Citas agendadas", value: stats.totalAppointments, icon: Calendar, from: "from-emerald-500", to: "to-teal-500", text: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Documentos subidos", value: stats.totalDocuments, icon: BookOpen, from: "from-pink-500", to: "to-rose-500", text: "text-pink-700", bg: "bg-pink-50" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">Panel de Administración</h1>
          <p className="text-sm text-slate-500">Métricas globales de la plataforma</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/admin/pricing")}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30"
        >
          <Crown className="w-4 h-4" /> Planes y precios
        </button>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
      >
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.05 }}
            whileHover={{ y: -2 }}
            className="bg-white rounded-2xl border border-slate-200/60 p-4 flex flex-col gap-3 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.from} ${s.to} flex items-center justify-center shadow-sm`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
              <p className="text-[11px] text-slate-500 font-medium leading-tight">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Users table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
      >
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-500" />
          <h2 className="font-bold text-slate-800 text-sm">Usuarios registrados</h2>
          <span className="ml-auto text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-100 px-2.5 py-0.5 rounded-lg">
            {stats.totalUsers} total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rol</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pacientes</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tareas</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.users.map((u, i) => {
                const initials = u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                const rl = ROLE_LABELS[u.role] ?? { label: u.role, className: "bg-slate-100 text-slate-600 border border-slate-200" };
                return (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.04 }}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-slate-800 text-sm">{u.name}</p>
                            {u.role === "admin" && <Crown className="w-3 h-3 text-amber-500" />}
                          </div>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" /> {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${rl.className}`}>
                        {rl.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-sm font-bold text-slate-700">{u.patientCount}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-sm font-bold text-slate-700">{u.taskCount}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-xs text-slate-400 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(u.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
