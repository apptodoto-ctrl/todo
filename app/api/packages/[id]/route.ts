import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, canAccessPatient } from "@/lib/center";
import { canManageMoney } from "@/lib/center";
import { absorbExistingSessions } from "@/lib/sessionPackages";

type Params = Promise<{ id: string }>;

async function checkOwnership(id: number) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  const pkg = await prisma.sessionPackage.findUnique({ where: { id }, include: { patient: true } });
  if (!pkg) return notFound();
  if (!canAccessPatient(scope, pkg.patient)) return forbidden();
  return null;
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!canManageMoney(scope)) return NextResponse.json({ error: "En el Centro, los paquetes los maneja la Administradora." }, { status: 403 });
  try {
    const { id } = await params;
    const err = await checkOwnership(Number(id));
    if (err) return err;
    const body = await req.json();

    const pkg = await prisma.sessionPackage.update({
      where: { id: Number(id) },
      data: {
        ...(body.paid !== undefined ? { paid: body.paid === true } : {}),
        ...(body.status !== undefined ? { status: String(body.status) } : {}),
        ...(body.expiresAt !== undefined ? { expiresAt: String(body.expiresAt) } : {}),
        ...(body.startDate !== undefined ? { startDate: String(body.startDate) } : {}),
        ...(body.name !== undefined ? { name: String(body.name).slice(0, 120) } : {}),
        ...(body.notes !== undefined ? { notes: String(body.notes).slice(0, 500) } : {}),
        ...(body.totalSessions !== undefined ? { totalSessions: Number(body.totalSessions) } : {}),
      },
    });

    // Marcar el paquete como pagado deja cobradas sus sesiones
    if (body.paid === true) {
      await prisma.sessionRecord.updateMany({ where: { packageId: pkg.id }, data: { paid: true } });
    }
    // Cambiar fechas o cupo puede hacer entrar sesiones que antes quedaban fuera
    if (body.startDate !== undefined || body.expiresAt !== undefined || body.totalSessions !== undefined) {
      await absorbExistingSessions(pkg.id);
    }
    return NextResponse.json(pkg);
  } catch (err) {
    console.error("Package update error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!canManageMoney(scope)) return NextResponse.json({ error: "En el Centro, los paquetes los maneja la Administradora." }, { status: 403 });
  try {
    const { id } = await params;
    const err = await checkOwnership(Number(id));
    if (err) return err;
    await prisma.sessionPackage.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
