import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden } from "@/lib/apiAuth";
import { getScope, seatUsage, parsePermissions, DEFAULT_PERMISSIONS, MAX_THERAPISTS } from "@/lib/center";
import { parseSchedule } from "@/lib/schedule";
import { sendEmail } from "@/lib/email";
import { randomBytes } from "crypto";

/** El equipo del Centro, con cuántos pacientes lleva cada una */
export async function GET() {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId) return NextResponse.json([]);
  if (!scope.isAdmin) return forbidden();

  const members = await prisma.centerMember.findMany({
    where: { centerId: scope.centerId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  const conteos = await prisma.patient.groupBy({
    by: ["therapistEmail"],
    where: { centerId: scope.centerId },
    _count: true,
  });
  const porTerapeuta = new Map(conteos.map((c) => [c.therapistEmail, c._count]));

  return NextResponse.json(
    members.map((m) => ({
      id: m.id,
      email: m.userEmail,
      name: m.name,
      role: m.role,
      active: m.active,
      permissions: parsePermissions(m.permissions),
      schedule: parseSchedule(m.schedule),
      payMode: m.payMode,
      payValue: m.payValue,
      pausedUntil: m.pausedUntil,
      pausedReason: m.pausedReason,
      title: m.title,
      registryId: m.registryId,
      specialty: m.specialty,
      pending: m.joinedAt === null,
      invitedAt: m.invitedAt,
      joinedAt: m.joinedAt,
      lastSeenAt: m.lastSeenAt,
      patients: porTerapeuta.get(m.userEmail) ?? 0,
    }))
  );
}

/** Invitar a una terapeuta: ocupa un cupo y recibe un correo para entrar */
export async function POST(req: Request) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId || !scope.isAdmin) return forbidden();
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Escribe un correo válido" }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: "Escribe el nombre de la terapeuta" }, { status: 400 });

    const yaEnCentro = await prisma.centerMember.findFirst({ where: { userEmail: email, active: true } });
    if (yaEnCentro) {
      return NextResponse.json(
        { error: yaEnCentro.centerId === scope.centerId ? "Esta terapeuta ya está en tu Centro" : "Este correo ya pertenece a otro Centro" },
        { status: 409 }
      );
    }

    const seats = await seatUsage(scope.centerId);
    const activos = await prisma.centerMember.count({ where: { centerId: scope.centerId, active: true, role: "terapeuta" } });
    if (activos >= MAX_THERAPISTS) {
      return NextResponse.json({ error: `Un Centro puede tener hasta ${MAX_THERAPISTS} terapeutas. Escríbenos si necesitas más.` }, { status: 409 });
    }
    // Sin cupos libres hay que confirmar el cobro del cupo extra
    if (seats.free <= 0 && body.confirmExtraSeat !== true) {
      return NextResponse.json(
        { error: "No te quedan cupos libres", needsExtraSeat: true, seats },
        { status: 409 }
      );
    }

    const token = randomBytes(24).toString("hex");
    const member = await prisma.centerMember.create({
      data: {
        centerId: scope.centerId,
        userEmail: email,
        name: name.slice(0, 120),
        role: "terapeuta",
        permissions: parsePermissions(body.permissions ?? DEFAULT_PERMISSIONS) as never,
        inviteToken: token,
      },
    });

    if (seats.free <= 0) {
      await prisma.center.update({ where: { id: scope.centerId }, data: { extraSeats: { increment: 1 } } });
    }

    const base = process.env.NEXTAUTH_URL || "https://app.todo-to.com";
    const link = `${base}/auth/invitacion?token=${token}`;
    sendEmail(
      email,
      `${scope.centerName} te invitó a TOdo Therapy`,
      `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:24px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">Te sumaron al equipo</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">
          <p style="color:#1e293b;margin:0 0 10px;">Hola ${name},</p>
          <p style="color:#475569;margin:0 0 18px;line-height:1.5;">
            <strong>${scope.centerName}</strong> te invitó a trabajar en TOdo Therapy. Crea tu contraseña y entra con tu propio acceso.
          </p>
          <a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;">Crear mi acceso</a>
          <p style="color:#94a3b8;font-size:12px;margin:18px 0 0;">Si no esperabas esta invitación, puedes ignorar este correo.</p>
        </div>
      </div>`
    ).catch((err) => console.error("[center] invitación no enviada:", err));

    return NextResponse.json({ id: member.id, email, name, usedExtraSeat: seats.free <= 0 }, { status: 201 });
  } catch (err) {
    console.error("Center invite error:", err);
    return NextResponse.json({ error: "No se pudo invitar a la terapeuta" }, { status: 500 });
  }
}
