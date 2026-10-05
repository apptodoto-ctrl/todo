import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";

type Params = Promise<{ id: string }>;

async function checkOwnership(id: number, email: string) {
  const pkg = await prisma.sessionPackage.findUnique({ where: { id } });
  if (!pkg) return notFound();
  if (pkg.createdBy !== email) return forbidden();
  return null;
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const err = await checkOwnership(Number(id), session.email);
    if (err) return err;
    const body = await req.json();

    const pkg = await prisma.sessionPackage.update({
      where: { id: Number(id) },
      data: {
        ...(body.paid !== undefined ? { paid: body.paid === true } : {}),
        ...(body.status !== undefined ? { status: String(body.status) } : {}),
        ...(body.expiresAt !== undefined ? { expiresAt: String(body.expiresAt) } : {}),
        ...(body.name !== undefined ? { name: String(body.name).slice(0, 120) } : {}),
        ...(body.notes !== undefined ? { notes: String(body.notes).slice(0, 500) } : {}),
        ...(body.totalSessions !== undefined ? { totalSessions: Number(body.totalSessions) } : {}),
      },
    });

    // Marcar el paquete como pagado deja cobradas sus sesiones
    if (body.paid === true) {
      await prisma.sessionRecord.updateMany({ where: { packageId: pkg.id }, data: { paid: true } });
    }
    return NextResponse.json(pkg);
  } catch (err) {
    console.error("Package update error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const err = await checkOwnership(Number(id), session.email);
    if (err) return err;
    await prisma.sessionPackage.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
