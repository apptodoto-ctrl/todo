import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const pipelines = await prisma.pipeline.findMany({
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
  try {
    const { name } = await req.json();
    const pipeline = await prisma.pipeline.create({
      data: { name },
      include: { columns: true },
    });
    return NextResponse.json(pipeline);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
