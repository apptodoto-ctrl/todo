import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope } from "@/lib/center";

type Params = Promise<{ id: string }>;

/** Marcar un aviso como leído */
export async function POST(_: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId) return forbidden();
  try {
    const { id } = await params;
    const aviso = await prisma.centerAnnouncement.findUnique({ where: { id } });
    if (!aviso || aviso.centerId !== scope.centerId) return notFound();

    const leidos = Array.isArray(aviso.readBy) ? aviso.readBy.map(String) : [];
    if (!leidos.includes(scope.email)) {
      await prisma.centerAnnouncement.update({
        where: { id },
        data: { readBy: [...leidos, scope.email] as never },
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId || !scope.isAdmin) return forbidden();
  try {
    const { id } = await params;
    const aviso = await prisma.centerAnnouncement.findUnique({ where: { id } });
    if (!aviso || aviso.centerId !== scope.centerId) return notFound();
    await prisma.centerAnnouncement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
