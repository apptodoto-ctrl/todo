"use client";

import { motion } from "framer-motion";
import {
  Users, Calendar, CheckSquare, Bell, TrendingUp, Clock, ArrowUpRight,
  Activity, Star, Zap, AlertCircle
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useRouter } from "next/navigation";

const statsData = [
  { label: "Usuarios activos", value: "24", change: "+3 este mes", icon: Users, color: "from-violet-500 to-purple-600", bg: "bg-violet-50", text: "text-violet-600", href: "/dashboard/usuarios" },
  { label: "Citas esta semana", value: "12", change: "3 hoy", icon: Calendar, color: "from-blue-500 to-indigo-600", bg: "bg-blue-50", text: "text-blue-600", href: "/dashboard/calendario" },
  { label: "Tareas pendientes", value: "8", change: "2 vencidas", icon: CheckSquare, color: "from-amber-500 to-orange-500", bg: "bg-amber-50", text: "text-amber-600", href: "/dashboard/tareas" },
  { label: "Recordatorios", value: "5", change: "1 próximo", icon: Bell, color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", text: "text-emerald-600", href: "/dashboard/recordatorios" },
];

const chartData = [
  { mes: "Oct", sesiones: 32, usuarios: 18 },
  { mes: "Nov", sesiones: 38, usuarios: 20 },
  { mes: "Dic", sesiones: 28, usuarios: 19 },
  { mes: "Ene", sesiones: 45, usuarios: 22 },
  { mes: "Feb", sesiones: 52, usuarios: 24 },
  { mes: "Mar", sesiones: 48, usuarios: 24 },
];

const recentPatients = [
  { name: "María González", age: 8, diagnosis: "TEA", session: "Hoy 10:00", status: "active" },
  { name: "Carlos Morales", age: 45, diagnosis: "ACV", session: "Hoy 14:30", status: "active" },
  { name: "Sofía Reyes", age: 6, diagnosis: "Desarrollo Motor", session: "Mañana 09:00", status: "pending" },
  { name: "Pedro Vargas", age: 67, diagnosis: "Artritis", session: "Mañana 11:00", status: "pending" },
];

const upcomingTasks = [
  { title: "Informe inicial - María G.", priority: "alta", due: "Hoy" },
  { title: "Revisión plan de Carlos M.", priority: "media", due: "Mañana" },
  { title: "Actualizar tabla de factores", priority: "baja", due: "Vie 28" },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function InicioPage() {
  const router = useRouter();
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Welcome */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Buenos días, <span className="text-violet-600">Josefina</span> 👋
          </h2>
          <p className="text-slate-500 mt-0.5">Aquí tienes el resumen de tu práctica clínica</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-violet-50 border border-violet-200/60 rounded-xl px-4 py-2">
          <Activity className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-medium text-violet-600">Sistema activo</span>
        </div>
      </motion.div>

      {/* Stats grid */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat) => (
          <div
            key={stat.label}
            onClick={() => router.push(stat.href)}
            className="bg-white rounded-2xl p-5 border border-slate-200/60 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.text}`} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-violet-400 transition-colors" />
            </div>
            <p className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
              {stat.value}
            </p>
            <p className="text-sm font-medium text-slate-600 mt-0.5">{stat.label}</p>
            <p className="text-xs text-slate-400 mt-1">{stat.change}</p>
          </div>
        ))}
      </motion.div>

      {/* Chart + Patients */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <motion.div variants={item} className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-800">Actividad Clínica</h3>
              <p className="text-xs text-slate-400 mt-0.5">Sesiones y usuarios últimos 6 meses</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-3 h-0.5 bg-violet-500 rounded inline-block" /> Sesiones
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-3 h-0.5 bg-indigo-400 rounded inline-block" /> Usuarios
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSesiones" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPacientes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "none", borderRadius: "12px", color: "#f8fafc", fontSize: 12 }}
                cursor={{ stroke: "#8b5cf6", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area type="monotone" dataKey="sesiones" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradSesiones)" dot={false} />
              <Area type="monotone" dataKey="usuarios" stroke="#6366f1" strokeWidth={2} fill="url(#gradPacientes)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Upcoming tasks */}
        <motion.div variants={item} className="bg-white rounded-2xl border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-800">Tareas Pendientes</h3>
            <span className="text-xs bg-amber-100 text-amber-600 font-medium px-2.5 py-1 rounded-lg">
              {upcomingTasks.length} pendientes
            </span>
          </div>
          <div className="space-y-3">
            {upcomingTasks.map((task, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer">
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                  task.priority === "alta" ? "bg-red-400" :
                  task.priority === "media" ? "bg-amber-400" : "bg-emerald-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{task.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {task.due}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => router.push("/dashboard/tareas")} className="mt-4 w-full text-sm font-medium text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl py-2.5 transition-colors">
            Ver todas las tareas
          </button>
        </motion.div>
      </div>

      {/* Recent patients */}
      <motion.div variants={item} className="bg-white rounded-2xl border border-slate-200/60">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Usuarios Recientes</h3>
          <button onClick={() => router.push("/dashboard/usuarios")} className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
            Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {recentPatients.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.age} años · {p.diagnosis}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-medium text-slate-600">{p.session}</p>
                  <p className="text-xs text-slate-400">Próxima sesión</p>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
                  p.status === "active"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-amber-100 text-amber-600"
                }`}>
                  {p.status === "active" ? "Activo" : "Pendiente"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
