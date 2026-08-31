import { NextRequest, NextResponse } from "next/server";
import { processAppointmentReminders } from "@/lib/appointmentReminders";
import { getSessionInfo } from "@/lib/apiAuth";

// Disparo manual del proceso de recordatorios: con sesión iniciada,
// o con Authorization: Bearer <CRON_SECRET> (para un cron externo).
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const hasCronToken =
    !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!hasCronToken) {
    const session = await getSessionInfo();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const result = await processAppointmentReminders();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Cron reminders error:", err);
    return NextResponse.json({ error: "Error procesando recordatorios" }, { status: 500 });
  }
}
