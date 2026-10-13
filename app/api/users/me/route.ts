import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";
import bcrypt from "bcryptjs";
import { isCurrency } from "@/lib/currency";
import { isCountry, countryConfig } from "@/lib/countries";

export async function GET() {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  const user = await prisma.user.findUnique({
    where: { email: session.email },
    select: { name: true, email: true, role: true, phone: true, specialty: true, currency: true, country: true },
  });
  if (!user) return unauthorized();
  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { name, phone, specialty, currency, country } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }
    const newName = name.trim();
    const user = await prisma.user.update({
      where: { email: session.email },
      data: {
        name: newName,
        ...(phone !== undefined ? { phone } : {}),
        ...(specialty !== undefined ? { specialty } : {}),
        // El país manda sobre la moneda: al cambiarlo se ajusta sola
        ...(isCountry(country) ? { country, currency: countryConfig(country).currency } : isCurrency(currency) ? { currency } : {}),
      },
      select: { name: true, email: true, phone: true, specialty: true, currency: true, country: true },
    });
    // El nombre de la terapeuta aparece en la ficha de cada paciente: se actualiza en todas
    await prisma.patient.updateMany({
      where: { createdBy: session.email },
      data: { therapist: newName },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el perfil" }, { status: 500 });
  }
}

/**
 * Cambio puntual de preferencias que no tocan la ficha de los pacientes.
 * Lo usa el selector de moneda del formulario de usuario.
 */
export async function PATCH(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { currency, country } = await req.json();
    if (country !== undefined) {
      if (!isCountry(country)) return NextResponse.json({ error: "País no válido" }, { status: 400 });
      const user = await prisma.user.update({
        where: { email: session.email },
        data: { country, currency: countryConfig(country).currency },
        select: { currency: true, country: true },
      });
      return NextResponse.json(user);
    }
    if (!isCurrency(currency)) {
      return NextResponse.json({ error: "Moneda no válida" }, { status: 400 });
    }
    const user = await prisma.user.update({
      where: { email: session.email },
      data: { currency },
      select: { currency: true, country: true },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la moneda" }, { status: 500 });
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
