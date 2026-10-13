import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope } from "@/lib/center";

type Params = Promise<{ id: string }>;

export async function DELETE(_: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId || !scope.isAdmin) return forbidden();
  try {
    const { id } = await params;
    const room = await prisma.centerRoom.findUnique({ where: { id } });
    if (!room || room.centerId !== scope.centerId) return notFound();
    // Se desactiva, no se borra: las citas pasadas conservan su sala
    await prisma.centerRoom.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
