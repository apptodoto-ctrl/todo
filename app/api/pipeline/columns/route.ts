import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const columns = await prisma.pipelineColumn.findMany({
      include: { cases: { orderBy: { createdAt: "asc" } } },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(columns);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const count = await prisma.pipelineColumn.count();
    const column = await prisma.pipelineColumn.create({
      data: { ...body, order: count },
      include: { cases: true },
    });
    return NextResponse.json(column, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
