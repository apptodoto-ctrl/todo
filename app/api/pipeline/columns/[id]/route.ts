import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = Promise<{ id: string }>;

export async function PUT(req: Request, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const column = await prisma.pipelineColumn.update({
      where: { id },
      data: body,
      include: { cases: true },
    });
    return NextResponse.json(column);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  try {
    const { id } = await params;
    await prisma.pipelineColumn.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
