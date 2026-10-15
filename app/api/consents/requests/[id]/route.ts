import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, canAccessPatient } from "@/lib/center";

type Params = Promise<{ id: string }>;

/** Retira un documento enviado que todavía no fue aceptado */
export async function DELETE(_: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  const { id } = await params;
  const r = await prisma.consentRequest.findUnique({ where: { id: Number(id) }, include: { patient: true } });
  if (!r) return notFound();
  if (!canAccessPatient(scope, r.patient)) return forbidden();
  if (r.acceptedAt) return NextResponse.json({ error: "Este documento ya fue aceptado; queda como registro." }, { status: 409 });
  await prisma.consentRequest.delete({ where: { id: r.id } });
  return NextResponse.json({ ok: true });
}
