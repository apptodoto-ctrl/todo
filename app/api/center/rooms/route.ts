import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden } from "@/lib/apiAuth";
import { getScope } from "@/lib/center";

/** Salas o boxes del Centro */
export async function GET() {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId) return NextResponse.json([]);
  const rooms = await prisma.centerRoom.findMany({
    where: { centerId: scope.centerId, active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(rooms);
}

export async function POST(req: Request) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId || !scope.isAdmin) return forbidden();
  try {
    const { name, notes } = await req.json();
    if (!String(name ?? "").trim()) return NextResponse.json({ error: "Ponle un nombre a la sala" }, { status: 400 });
    const room = await prisma.centerRoom.create({
      data: { centerId: scope.centerId, name: String(name).slice(0, 80), notes: String(notes ?? "").slice(0, 200) },
    });
    return NextResponse.json(room, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo crear la sala" }, { status: 500 });
  }
}
