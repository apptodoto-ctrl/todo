import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff, audit } from "@/lib/adminPanel";

/** Lista de interruptores: qué hay, si está encendido y para quién */
export async function GET() {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const flags = await prisma.featureFlag.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(flags);
}

export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    const body = await req.json();
    const key = String(body.key ?? "").trim();
    if (!key) return NextResponse.json({ error: "Falta la clave de la función" }, { status: 400 });

    const flag = await prisma.featureFlag.upsert({
      where: { key },
      update: {
        ...(body.name !== undefined ? { name: String(body.name).slice(0, 120) } : {}),
        ...(body.description !== undefined ? { description: String(body.description).slice(0, 400) } : {}),
        ...(body.enabled !== undefined ? { enabled: body.enabled === true } : {}),
        ...(body.audience !== undefined ? { audience: body.audience as never } : {}),
      },
      create: {
        key,
        name: String(body.name ?? key).slice(0, 120),
        description: String(body.description ?? "").slice(0, 400),
        enabled: body.enabled === true,
        audience: (body.audience ?? {}) as never,
      },
    });

    await audit({
      actor: String(body.actor ?? staff.name),
      action: "interruptor",
      after: { key: flag.key, enabled: flag.enabled, audience: flag.audience },
      reason: String(body.reason ?? ""),
    });

    return NextResponse.json(flag);
  } catch {
    return NextResponse.json({ error: "No se pudo guardar el interruptor" }, { status: 500 });
  }
}
