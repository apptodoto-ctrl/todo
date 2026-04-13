"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Brain, Loader2, ArrowRight, CheckCircle2, Zap, ShieldCheck } from "lucide-react";

const DEMO_USERS = [
  { role: "Admin", email: "admin@todo.com", password: "admin123", color: "from-violet-500 to-purple-600", badge: "bg-violet-100 text-violet-700" },
  { role: "Terapeuta", email: "japieaters@gmail.com", password: "todo123", color: "from-blue-500 to-indigo-600", badge: "bg-blue-100 text-blue-700" },
];

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "", name: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));

    if (tab === "register") {
      if (!form.name.trim()) {
        setError("Por favor ingresa tu nombre completo.");
        setLoading(false);
        return;
      }
      if (form.password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        setLoading(false);
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Las contraseñas no coinciden.");
        setLoading(false);
        return;
      }
      router.push("/dashboard/inicio");
      return;
    }

    const valid = DEMO_USERS.find(
      (u) => u.email === form.email && u.password === form.password
    );
    if (!valid) {
      setError("Credenciales incorrectas. Usa uno de los accesos de prueba.");
      setLoading(false);
      return;
    }
    router.push("/dashboard/inicio");
  };

  const fillDemo = (user: typeof DEMO_USERS[0]) => {
    setForm((f) => ({ ...f, email: user.email, password: user.password }));
    setError("");
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 -right-32 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, 15, 0], y: [0, -15, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-20 left-1/3 w-72 h-72 bg-purple-400/15 rounded-full blur-3xl"
        />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[55%] p-16 relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Brain className="w-9 h-9 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">TOdo</span>
        </div>

        {/* Hero text */}
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-5xl font-bold text-white leading-tight">
              Potencia tu<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-purple-300">
                práctica clínica
              </span><br />
              con IA
            </h1>
            <p className="mt-6 text-lg text-violet-200/70 max-w-md leading-relaxed">
              La plataforma integral para terapeutas ocupacionales. Gestiona usuarios, citas y genera informes con inteligencia artificial.
            </p>
          </motion.div>

          {/* Features list */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="space-y-4"
          >
            {[
              "Asistentes de IA para informes clínicos",
              "Pipeline de casos con vista Kanban",
              "Calendario y gestión de citas",
              "Biblioteca de recursos terapéuticos",
            ].map((feat, i) => (
              <motion.div
                key={feat}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="flex items-center gap-3 text-violet-200/80"
              >
                <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0" />
                <span className="text-sm">{feat}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Footer */}
        <p className="text-violet-300/40 text-sm">
          © 2026 TOdo — Terapia Ocupacional Digital
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-8 shadow-2xl shadow-black/30">
            {/* Mobile logo */}
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-400 to-purple-600 rounded-2xl flex items-center justify-center">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <span className="text-white font-bold text-lg">TOdo</span>
            </div>

            {/* Tab switcher */}
            <div className="flex bg-white/[0.06] rounded-2xl p-1 mb-8">
              {(["login", "register"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    tab === t
                      ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30"
                      : "text-white/50 hover:text-white/70"
                  }`}
                >
                  {t === "login" ? "Iniciar Sesión" : "Registrarse"}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.form
                key={tab}
                initial={{ opacity: 0, x: tab === "login" ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: tab === "login" ? 10 : -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* Heading */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {tab === "login" ? "Bienvenida de vuelta" : "Crear cuenta"}
                  </h2>
                  <p className="text-white/50 text-sm mt-1">
                    {tab === "login"
                      ? "Ingresa tus credenciales para continuar"
                      : "Completa el formulario para comenzar"}
                  </p>
                </div>

                {/* Name (register only) */}
                {tab === "register" && (
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Josefina Pizarro"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-white/[0.07] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all text-sm"
                    />
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="w-full bg-white/[0.07] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all text-sm"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      className="w-full bg-white/[0.07] border border-white/[0.12] rounded-xl px-4 py-3 pr-12 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/40 hover:text-white/70 transition-colors rounded-lg hover:bg-white/10"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm password (register) */}
                {tab === "register" && (
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Confirmar contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        className="w-full bg-white/[0.07] border border-white/[0.12] rounded-xl px-4 py-3 pr-12 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/40 hover:text-white/70 transition-colors rounded-lg hover:bg-white/10"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Remember me + Forgot (login only) */}
                {tab === "login" && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <div
                        onClick={() => setRememberMe(!rememberMe)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          rememberMe
                            ? "bg-violet-500 border-violet-500"
                            : "border-white/20 hover:border-violet-400/50"
                        }`}
                      >
                        {rememberMe && (
                          <motion.svg
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 12 12"
                          >
                            <path
                              d="M2 6l3 3 5-5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </motion.svg>
                        )}
                      </div>
                      <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                        Recordar contraseña
                      </span>
                    </label>
                    <button
                      type="button"
                      className="text-sm text-violet-300/80 hover:text-violet-300 transition-colors font-medium"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                )}

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-3 text-sm text-red-300"
                    >
                      <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Demo access buttons */}
                {tab === "login" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-white/25">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-3 h-3" /> Acceso rápido
                      </span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {DEMO_USERS.map((user) => (
                        <button
                          key={user.email}
                          type="button"
                          onClick={() => fillDemo(user)}
                          className="flex items-center gap-2.5 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] hover:border-white/[0.2] rounded-xl px-3 py-2.5 transition-all text-left group"
                        >
                          <div className={`w-7 h-7 bg-gradient-to-br ${user.color} rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-md`}>
                            {user.role[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white/80 group-hover:text-white transition-colors">{user.role}</p>
                            <p className="text-[10px] text-white/30 truncate">{user.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.99 }}
                  className="w-full mt-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <span>{tab === "login" ? "Iniciar Sesión" : "Crear Cuenta"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </motion.form>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <p className="text-center text-violet-300/40 text-xs mt-6">
            Plataforma segura · Datos protegidos · © 2026 TOdo
          </p>
        </motion.div>
      </div>
    </div>
  );
}
