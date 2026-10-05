import { NextResponse } from "next/server";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";
import { ensureCalendarToken, regenerateCalendarToken } from "@/lib/calendarFeed";

export async function GET() {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const token = await ensureCalendarToken(session.email);
    if (!token) return NextResponse.json({ error: "Tu cuenta ya no existe. Vuelve a iniciar sesión." }, { status: 404 });
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "No se pudo preparar el calendario" }, { status: 500 });
  }
}

export async function POST() {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const token = await regenerateCalendarToken(session.email);
    if (!token) return NextResponse.json({ error: "Tu cuenta ya no existe. Vuelve a iniciar sesión." }, { status: 404 });
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "No se pudo regenerar el enlace" }, { status: 500 });
  }
}
