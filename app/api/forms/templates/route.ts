import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";
import { sanitizeSections, FICHA_INICIO } from "@/lib/formTemplates";

export async function GET(req: NextRequest) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const includeArchived = req.nextUrl.searchParams.get("archived") === "1";
    const templates = await prisma.formTemplate.findMany({
      where: { createdBy: session.email, ...(includeArchived ? {} : { archived: false }) },
      orderBy: [{ archived: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { responses: true } } },
    });
    return NextResponse.json(
      templates.map((t) => ({ ...t, usos: t._count.responses }))
    );
  } catch (err) {
    console.error("Form templates error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const body = await req.json();

    // Copia de la plantilla tipo de TOdo, lista para editar
    if (body.useFichaInicio === true) {
      const created = await prisma.formTemplate.create({
        data: {
          name: FICHA_INICIO.name,
          description: FICHA_INICIO.description,
          sections: FICHA_INICIO.sections as never,
          origin: "todo",
          createdBy: session.email,
        },
      });
      return NextResponse.json(created, { status: 201 });
    }

    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Ponle un nombre a la plantilla" }, { status: 400 });

    const created = await prisma.formTemplate.create({
      data: {
        name: name.slice(0, 120),
        description: String(body.description ?? "").slice(0, 400),
        sections: sanitizeSections(body.sections) as never,
        createdBy: session.email,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("Form template create error:", err);
    return NextResponse.json({ error: "No se pudo crear la plantilla" }, { status: 500 });
  }
}
