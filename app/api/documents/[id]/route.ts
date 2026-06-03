import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteFromR2 } from "@/lib/r2";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id: parseInt(id) } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteFromR2(doc.key);
  await prisma.document.delete({ where: { id: doc.id } });

  return NextResponse.json({ success: true });
}
