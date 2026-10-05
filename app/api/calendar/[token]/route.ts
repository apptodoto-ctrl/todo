import { NextResponse } from "next/server";
import { buildCalendarFeed } from "@/lib/calendarFeed";

type Params = Promise<{ token: string }>;

/**
 * Feed público protegido por token: la terapeuta lo pega en Google Calendar
 * (Otros calendarios → Desde URL) y ve ahí su agenda de TOdo.
 */
export async function GET(_: Request, { params }: { params: Params }) {
  const { token } = await params;
  const clean = token.replace(/\.ics$/i, "");
  const feed = await buildCalendarFeed(clean);
  if (!feed) {
    return new NextResponse("Calendario no encontrado", { status: 404 });
  }
  return new NextResponse(feed, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="todo-therapy.ics"',
      // Datos clínicos: nada de cachés compartidas ni buscadores
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
