import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  const user = await prisma.user.findUnique({
    where: { email: session.email },
    select: { name: true, email: true, role: true, phone: true, specialty: true },
  });
  if (!user) return unauthorized();
  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { name, phone, specialty } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }
    const user = await prisma.user.update({
      where: { email: session.email },
      data: {
        name: name.trim(),
        ...(phone !== undefined ? { phone } : {}),
        ...(specialty !== undefined ? { specialty } : {}),
      },
      select: { name: true, email: true, phone: true, specialty: true },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el perfil" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { password } = await req.json();
    const user = await prisma.user.findUnique({ where: { email: session.email } });
    if (!user) return unauthorized();
    const valid = await bcrypt.compare(password || "", user.password);
    if (!valid) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 400 });
    }
    const email = session.email;
    // Elimina todos los datos del usuario. Las sesiones clínicas y casos caen en
    // cascada al eliminar pacientes y pipelines.
    await prisma.$transaction([
      prisma.task.deleteMany({ where: { createdBy: email } }),
      prisma.appointment.deleteMany({ where: { createdBy: email } }),
      prisma.document.deleteMany({ where: { createdBy: email } }),
      prisma.patient.deleteMany({ where: { createdBy: email } }),
      prisma.pipeline.deleteMany({ where: { createdBy: email } }),
      prisma.user.delete({ where: { email } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar la cuenta" }, { status: 500 });
  }
}
