import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, ownScope } from "@/lib/center";

type Params = Promise<{ id: string }>;

async function checkOwnership(id: string) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  const pipeline = await prisma.pipeline.findFirst({ where: { id, ...ownScope(scope) } });
  if (pipeline) return null;
  const existe = await prisma.pipeline.findUnique({ where: { id } });
  return existe ? forbidden() : notFound();
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id } = await params;
    const err = await checkOwnership(id);
    if (err) return err;
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
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id } = await params;
    const err = await checkOwnership(id);
    if (err) return err;
    await prisma.pipeline.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
