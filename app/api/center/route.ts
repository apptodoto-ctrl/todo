import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden } from "@/lib/apiAuth";
import { getScope, seatUsage, DEFAULT_PERMISSIONS, parsePermissions, canOwnCenter } from "@/lib/center";
import { countryConfig } from "@/lib/countries";

/** Datos del Centro de quien pregunta, o null si tiene cuenta individual */
export async function GET() {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId) {
    const permiso = await canOwnCenter(scope.email);
    return NextResponse.json({ center: null, role: "individual", canOwnCenter: permiso.ok, plan: permiso.plan });
  }

  const center = await prisma.center.findUnique({ where: { id: scope.centerId } });
  const seats = await seatUsage(scope.centerId);
  return NextResponse.json({
    center,
    role: scope.role,
    permissions: scope.permissions,
    seats,
  });
}

/** Convierte la cuenta de quien llama en un Centro, con ella de Administradora */
export async function POST(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const existing = await prisma.centerMember.findFirst({ where: { userEmail: session.email, active: true } });
    if (existing) {
      return NextResponse.json({ error: "Esta cuenta ya pertenece a un Centro" }, { status: 409 });
    }

    // Un Centro necesita un plan Centro: una cuenta Profesional trabaja sola
    const permiso = await canOwnCenter(session.email);
    if (!permiso.ok) {
      return NextResponse.json(
        {
          error: permiso.plan
            ? `Tu plan es ${permiso.plan} y trabaja con una sola terapeuta. Para armar un equipo necesitas el plan Centro.`
            : "Necesitas un plan Centro para armar un equipo.",
          code: "needs_center_plan",
          currentPlan: permiso.plan,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Ponle un nombre al Centro" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: session.email }, select: { country: true, name: true } });
    const country = user?.country ?? "CL";

    const center = await prisma.center.create({
      data: {
        name: name.slice(0, 160),
        address: String(body.address ?? "").slice(0, 240),
        taxId: String(body.taxId ?? "").slice(0, 40),
        phone: String(body.phone ?? "").slice(0, 40),
        attendanceMode: ["centro", "domicilio", "ambos"].includes(body.attendanceMode) ? body.attendanceMode : "ambos",
        country,
        currency: countryConfig(country).currency,
        adminEmail: session.email,
      },
    });

    await prisma.centerMember.create({
      data: {
        centerId: center.id,
        userEmail: session.email,
        name: user?.name ?? session.name,
        role: "administradora",
        permissions: parsePermissions(DEFAULT_PERMISSIONS) as never,
        joinedAt: new Date(),
      },
    });

    // Todo lo que esta cuenta ya tenía pasa a ser del Centro
    const where = { createdBy: session.email, centerId: null };
    await prisma.$transaction([
      prisma.patient.updateMany({ where, data: { centerId: center.id } }),
      prisma.appointment.updateMany({ where, data: { centerId: center.id } }),
      prisma.task.updateMany({ where, data: { centerId: center.id } }),
      prisma.document.updateMany({ where, data: { centerId: center.id } }),
      prisma.generatedReport.updateMany({ where, data: { centerId: center.id } }),
      prisma.sessionPackage.updateMany({ where, data: { centerId: center.id } }),
      prisma.formTemplate.updateMany({ where, data: { centerId: center.id } }),
      prisma.reminder.updateMany({ where, data: { centerId: center.id } }),
      prisma.pipeline.updateMany({ where, data: { centerId: center.id } }),
      prisma.internalNote.updateMany({ where, data: { centerId: center.id } }),
      prisma.consentTemplate.updateMany({ where, data: { centerId: center.id } }),
      prisma.consentRequest.updateMany({ where, data: { centerId: center.id } }),
    ]);

    return NextResponse.json(center, { status: 201 });
  } catch (err) {
    console.error("Center create error:", err);
    return NextResponse.json({ error: "No se pudo crear el Centro" }, { status: 500 });
  }
}

/** Configuración del Centro: solo la Administradora */
export async function PATCH(req: Request) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId || !scope.isAdmin) return forbidden();
  try {
    const body = await req.json();
    const center = await prisma.center.update({
      where: { id: scope.centerId },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).slice(0, 160) } : {}),
        ...(body.address !== undefined ? { address: String(body.address).slice(0, 240) } : {}),
        ...(body.taxId !== undefined ? { taxId: String(body.taxId).slice(0, 40) } : {}),
        ...(body.phone !== undefined ? { phone: String(body.phone).slice(0, 40) } : {}),
        ...(body.logoUrl !== undefined ? { logoUrl: String(body.logoUrl).slice(0, 500) } : {}),
        ...(["centro", "domicilio", "ambos"].includes(body.attendanceMode) ? { attendanceMode: body.attendanceMode } : {}),
      },
    });
    return NextResponse.json(center);
  } catch {
    return NextResponse.json({ error: "No se pudo guardar el Centro" }, { status: 500 });
  }
}
