import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

/** Datos de una invitación, para la pantalla donde la terapeuta crea su clave */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (token.length < 16) return NextResponse.json({ error: "Invitación no válida" }, { status: 404 });

  const member = await prisma.centerMember.findUnique({
    where: { inviteToken: token },
    include: { center: { select: { name: true } } },
  });
  if (!member || member.joinedAt) return NextResponse.json({ error: "Esta invitación ya no está disponible" }, { status: 404 });

  const yaTieneCuenta = !!(await prisma.user.findUnique({ where: { email: member.userEmail } }));
  return NextResponse.json({
    email: member.userEmail,
    name: member.name,
    centerName: member.center.name,
    hasAccount: yaTieneCuenta,
  });
}

/** Acepta la invitación: crea la cuenta si hace falta y entra al Centro */
export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    const member = await prisma.centerMember.findUnique({ where: { inviteToken: String(token ?? "") } });
    if (!member || member.joinedAt) {
      return NextResponse.json({ error: "Esta invitación ya no está disponible" }, { status: 404 });
    }

    const existing = await prisma.user.findUnique({ where: { email: member.userEmail } });
    if (!existing) {
      if (!password || String(password).length < 6) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
      }
      const center = await prisma.center.findUnique({ where: { id: member.centerId }, select: { country: true, currency: true } });
      await prisma.user.create({
        data: {
          name: member.name || member.userEmail,
          email: member.userEmail,
          password: await bcrypt.hash(String(password), 12),
          country: center?.country ?? "CL",
          currency: center?.currency ?? "CLP",
        },
      });
    }

    await prisma.centerMember.update({
      where: { id: member.id },
      data: { joinedAt: new Date(), inviteToken: null },
    });

    return NextResponse.json({ ok: true, email: member.userEmail });
  } catch (err) {
    console.error("Center invite accept error:", err);
    return NextResponse.json({ error: "No se pudo aceptar la invitación" }, { status: 500 });
  }
}
