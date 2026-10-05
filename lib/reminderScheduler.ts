const globalScheduler = globalThis as unknown as { reminderInterval?: ReturnType<typeof setInterval> };

const INTERVAL_MS = 10 * 60 * 1000; // cada 10 minutos

export function startReminderScheduler() {
  if (globalScheduler.reminderInterval) return;

  const tick = async () => {
    try {
      const { processAppointmentReminders, convertPastAppointments } = await import("@/lib/appointmentReminders");
      const { sent, checked } = await processAppointmentReminders();
      if (sent > 0) console.log(`[reminders] ${sent} recordatorio(s) enviado(s) de ${checked} citas revisadas`);
      const converted = await convertPastAppointments();
      if (converted > 0) console.log(`[sessions] ${converted} cita(s) pasaron al historial clínico`);
    } catch (err) {
      console.error("[reminders] scheduler error:", err);
    }
  };

  globalScheduler.reminderInterval = setInterval(tick, INTERVAL_MS);
  // Primera pasada al minuto de arrancar (deja que el servidor termine de levantar)
  setTimeout(tick, 60 * 1000);
  console.log("[reminders] scheduler iniciado (cada 10 min)");
}
