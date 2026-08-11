import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { currentPassword, newPassword } = await req.json();
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.email } });
    if (!user) return unauthorized();
    const valid = await bcrypt.compare(currentPassword || "", user.password);
    if (!valid) {
      return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { email: session.email }, data: { password: hashed } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo cambiar la contraseña" }, { status: 500 });
  }
}
