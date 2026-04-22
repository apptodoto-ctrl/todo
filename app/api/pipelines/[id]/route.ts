import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = Promise<{ id: string }>;

export async function PUT(req: Request, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const { name } = await req.json();
    const pipeline = await prisma.pipeline.update({
      where: { id },
      data: { name },
    });
    return NextResponse.json(pipeline);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  try {
    const { id } = await params;
    await prisma.pipeline.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
