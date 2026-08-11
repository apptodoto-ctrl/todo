import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";

export async function GET() {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const pipelines = await prisma.pipeline.findMany({
      where: { createdBy: session.email },
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
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { name } = await req.json();
    const pipeline = await prisma.pipeline.create({
      data: { name, createdBy: session.email },
      include: { columns: true },
    });
    return NextResponse.json(pipeline);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
