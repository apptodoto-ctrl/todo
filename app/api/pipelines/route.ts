import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized } from "@/lib/apiAuth";
import { getScope, ownScope, ownerFields } from "@/lib/center";

export async function GET() {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const pipelines = await prisma.pipeline.findMany({
      where: ownScope(scope),
      orderBy: { createdAt: "asc" },
      include: {
        columns: {
          orderBy: { order: "asc" },
          include: { cases: { orderBy: { createdAt: "asc" } } },
        },
      },
    });
    return NextResponse.json(pipelines);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { name } = await req.json();
    const pipeline = await prisma.pipeline.create({
      data: { name, ...ownerFields(scope) },
      include: { columns: true },
    });
    return NextResponse.json(pipeline);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
