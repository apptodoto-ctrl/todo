import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, ownScope, can } from "@/lib/center";

type Params = Promise<{ id: string }>;

/** Dentro de un Centro, la Administradora alcanza lo de todo su equipo */
async function ownedReport(id: number) {
  const scope = await getScope();
  if (!scope) return { error: unauthorized() };
  const report = await prisma.generatedReport.findFirst({ where: { id, ...ownScope(scope) } });
  if (report) return { report };
  const existe = await prisma.generatedReport.findUnique({ where: { id } });
  return { error: existe ? forbidden() : notFound() };
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id } = await params;
    const check = await ownedReport(Number(id));
    if ("error" in check) return check.error;
    const { title, content, reviewState, reviewNote } = await req.json();

    // Circuito de aprobación: la terapeuta manda a revisión, la
    // Administradora aprueba o devuelve, y solo un informe aprobado se envía
    let revision = {};
    if (reviewState !== undefined) {
      const estados = ["borrador", "en_revision", "aprobado", "enviado"];
      if (!estados.includes(reviewState)) {
        return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
      }
      const esAdmin = scope.isAdmin || !scope.centerId;
      if ((reviewState === "aprobado" || reviewState === "borrador") && !esAdmin && check.report.reviewState === "en_revision") {
        return NextResponse.json({ error: "La Administradora decide si el informe queda aprobado" }, { status: 403 });
      }
      if (reviewState === "enviado") {
        if (scope.centerId && !can(scope, "enviarInformes")) {
          return NextResponse.json({ error: "Tu Centro no te permite enviar informes a las familias." }, { status: 403 });
        }
        if (scope.centerId && !esAdmin && check.report.reviewState !== "aprobado") {
          return NextResponse.json(
            { error: "Este informe todavía no está aprobado por la Administradora.", needsApproval: true },
            { status: 409 }
          );
        }
      }
      revision = {
        reviewState,
        ...(reviewNote !== undefined ? { reviewNote: String(reviewNote).slice(0, 500) } : {}),
        reviewedBy: esAdmin ? scope.email : check.report.reviewedBy,
      };
    }

    const report = await prisma.generatedReport.update({
      where: { id: Number(id) },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
        ...revision,
      },
    });
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const { id } = await params;
    const check = await ownedReport(Number(id));
    if ("error" in check) return check.error;
    await prisma.generatedReport.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
