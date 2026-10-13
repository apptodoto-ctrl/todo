import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden } from "@/lib/apiAuth";
import { getScope } from "@/lib/center";
import { sendEmail } from "@/lib/email";

function destinatarios(audience: unknown): string[] {
  return Array.isArray(audience) ? audience.map(String) : [];
}

/** Avisos que le tocan a quien pregunta */
export async function GET() {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId) return NextResponse.json([]);

  const avisos = await prisma.centerAnnouncement.findMany({
    where: { centerId: scope.centerId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const mios = avisos.filter((a) => {
    const para = destinatarios(a.audience);
    return scope.isAdmin || para.length === 0 || para.includes(scope.email);
  });

  return NextResponse.json(
    mios.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      authorName: a.authorName,
      createdAt: a.createdAt,
      audience: destinatarios(a.audience),
      read: destinatarios(a.readBy).includes(scope.email),
      readCount: destinatarios(a.readBy).length,
    }))
  );
}

/** La Administradora manda un aviso a todo el equipo o a algunas */
export async function POST(req: Request) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId || !scope.isAdmin) return forbidden();
  try {
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "Escribe el aviso" }, { status: 400 });

    const miembros = await prisma.centerMember.findMany({
      where: { centerId: scope.centerId, active: true, joinedAt: { not: null }, role: "terapeuta" },
      select: { userEmail: true, name: true },
    });
    const elegidas = Array.isArray(body.audience) && body.audience.length > 0
      ? miembros.filter((m) => body.audience.includes(m.userEmail))
      : miembros;

    const aviso = await prisma.centerAnnouncement.create({
      data: {
        centerId: scope.centerId,
        title: title.slice(0, 180),
        body: String(body.body ?? "").slice(0, 2000),
        audience: (Array.isArray(body.audience) && body.audience.length > 0 ? body.audience.map(String) : []) as never,
        authorName: scope.name,
        createdBy: scope.email,
        readBy: [] as never,
      },
    });

    // Lo ven al entrar y además les llega por correo
    for (const m of elegidas) {
      sendEmail(
        m.userEmail,
        `${scope.centerName}: ${title}`,
        `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:540px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:22px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:19px;">Aviso del Centro</h1>
          </div>
          <div style="background:#f8fafc;padding:22px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">
            <h2 style="color:#1e293b;margin:0 0 8px;font-size:17px;">${title}</h2>
            ${aviso.body ? `<p style="color:#475569;margin:0 0 14px;line-height:1.5;white-space:pre-wrap;">${aviso.body}</p>` : ""}
            <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;">${scope.name} · ${scope.centerName}</p>
          </div>
        </div>`
      ).catch((err) => console.error("[center] aviso no enviado:", err));
    }

    return NextResponse.json({ ...aviso, enviados: elegidas.length }, { status: 201 });
  } catch (err) {
    console.error("Center announcement error:", err);
    return NextResponse.json({ error: "No se pudo enviar el aviso" }, { status: 500 });
  }
}
