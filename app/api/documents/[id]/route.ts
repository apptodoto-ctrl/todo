import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteFromR2, getPresignedUrl } from "@/lib/r2";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";

type Params = Promise<{ id: string }>;

async function ownedDoc(id: number, email: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return { error: notFound() };
  if (doc.createdBy !== email) return { error: forbidden() };
  return { doc };
}

// Devuelve una URL firmada temporal (1 hora) para ver/descargar el documento
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  const { id } = await params;
  const check = await ownedDoc(parseInt(id), session.email);
  if ("error" in check) return check.error;
  try {
    const url = await getPresignedUrl(check.doc.key, 3600);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "No se pudo generar el enlace" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  const { id } = await params;
  const check = await ownedDoc(parseInt(id), session.email);
  if ("error" in check) return check.error;

  await deleteFromR2(check.doc.key);
  await prisma.document.delete({ where: { id: check.doc.id } });

  return NextResponse.json({ success: true });
}
