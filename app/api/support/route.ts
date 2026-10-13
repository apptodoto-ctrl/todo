import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";
import { sendEmail } from "@/lib/email";

/** Una terapeuta manda una consulta desde el botón de ayuda */
export async function POST(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { message, screen } = await req.json();
    const texto = String(message ?? "").trim();
    if (!texto) return NextResponse.json({ error: "Escribe tu consulta" }, { status: 400 });

    const ticket = await prisma.supportTicket.create({
      data: {
        userEmail: session.email,
        userName: session.name,
        screen: String(screen ?? "").slice(0, 120),
        message: texto.slice(0, 4000),
      },
    });

    const panel = process.env.SUPPORT_EMAIL || process.env.MAIL_USER || "";
    if (panel) {
      sendEmail(
        panel,
        `Consulta de ${session.name}`,
        `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;">
          <h2 style="color:#1e293b;font-size:17px;margin:0 0 10px;">Nueva consulta en TOdo</h2>
          <p style="color:#475569;margin:0 0 6px;"><strong>${session.name}</strong> · ${session.email}</p>
          ${ticket.screen ? `<p style="color:#94a3b8;font-size:12px;margin:0 0 12px;">Desde: ${ticket.screen}</p>` : ""}
          <p style="color:#1e293b;white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;">${texto}</p>
        </div>`
      ).catch((err) => console.error("[soporte] aviso no enviado:", err));
    }

    return NextResponse.json({ ok: true, id: ticket.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo enviar la consulta" }, { status: 500 });
  }
}
