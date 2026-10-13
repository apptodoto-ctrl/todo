import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff, audit } from "@/lib/adminPanel";
import { sendEmail } from "@/lib/email";

/** Bandeja de consultas de los clientes */
export async function GET(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const tickets = await prisma.supportTicket.findMany({
    where: state ? { state } : {},
    orderBy: [{ state: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  return NextResponse.json(tickets);
}

/** Responder una consulta: la respuesta le llega por correo y queda guardada */
export async function PATCH(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    const body = await req.json();
    const ticket = await prisma.supportTicket.findUnique({ where: { id: Number(body.id) } });
    if (!ticket) return NextResponse.json({ error: "No existe esa consulta" }, { status: 404 });

    const reply = String(body.reply ?? "").trim();
    const state = ["nueva", "en_curso", "resuelta"].includes(body.state) ? body.state : ticket.state;

    const actualizado = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        state,
        ...(reply ? { reply, repliedBy: String(body.actor ?? staff.name), repliedAt: new Date() } : {}),
      },
    });

    if (reply) {
      sendEmail(
        ticket.userEmail,
        "Respuesta del equipo de TOdo",
        `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:22px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:19px;">Te respondimos</h1>
          </div>
          <div style="background:#f8fafc;padding:22px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">
            <p style="color:#1e293b;margin:0 0 14px;white-space:pre-wrap;">${reply}</p>
            <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">Tu consulta fue:</p>
            <p style="color:#64748b;font-size:13px;margin:0;white-space:pre-wrap;border-left:3px solid #e2e8f0;padding-left:10px;">${ticket.message}</p>
          </div>
        </div>`
      ).catch((err) => console.error("[soporte] respuesta no enviada:", err));

      await audit({ actor: String(body.actor ?? staff.name), targetEmail: ticket.userEmail, action: "responder_consulta", after: { id: ticket.id, state } });
    }

    return NextResponse.json(actualizado);
  } catch {
    return NextResponse.json({ error: "No se pudo responder" }, { status: 500 });
  }
}
