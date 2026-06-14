import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const createdBy = req.nextUrl.searchParams.get("createdBy") || "";
    const pipelines = await prisma.pipeline.findMany({
      where: createdBy ? { createdBy } : undefined,
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
    const { name, createdBy } = await req.json();
    const pipeline = await prisma.pipeline.create({
      data: { name, createdBy: createdBy || "" },
      include: { columns: true },
    });
    return NextResponse.json(pipeline);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
