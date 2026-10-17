import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope } from "@/lib/center";

type Params = Promise<{ id: string }>;

export async function DELETE(_: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId || !scope.isAdmin) return forbidden();
  const { id } = await params;
  const e = await prisma.centerExpense.findUnique({ where: { id: Number(id) } });
  if (!e) return notFound();
  if (e.centerId !== scope.centerId) return forbidden();
  await prisma.centerExpense.delete({ where: { id: e.id } });
  return NextResponse.json({ ok: true });
}
