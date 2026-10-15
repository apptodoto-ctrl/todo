import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, patientScope, loadPatient, ownerFields, centerScope } from "@/lib/center";
import { fillPlaceholders, archiveAcceptedConsent } from "@/lib/consents";
import { sendEmail } from "@/lib/email";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  const patientId = req.nextUrl.searchParams.get("patientId");
  const where = { patient: patientScope(scope) as never, ...(patientId ? { patientId: Number(patientId) } : {}) };
  const select = { id: true, title: true, sentTo: true, sentAt: true, acceptedAt: true, acceptedName: true, acceptedEmail: true, documentId: true, patientId: true, token: true };
  const list = await prisma.consentRequest.findMany({ where, orderBy: { sentAt: "desc" }, select });
  // Aceptados cuyo archivo no alcanzó a guardarse: se reintenta aquí, sin frenar la respuesta si vuelve a fallar
  const sinArchivo = list.filter((r) => r.acceptedAt && !r.documentId);
  for (const r of sinArchivo) {
    try { r.documentId = await archiveAcceptedConsent(r.id); } catch (err) { console.error("Consent archive retry error:", err); }
  }
  return NextResponse.json(list);
}

/** Envía un documento a la familia para que lo lea y lo acepte en línea */
export async function POST(req: Request) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const body = await req.json();
    const patientId = Number(body.patientId);
    const templateId = Number(body.templateId);
    if (!Number.isInteger(patientId) || !Number.isInteger(templateId)) {
      return NextResponse.json({ error: "Falta el usuario o el documento" }, { status: 400 });
    }
    const { patient, status } = await loadPatient(scope, patientId);
    if (status === 404) return notFound();
    if (status === 403 || !patient) return forbidden();

    const template = await prisma.consentTemplate.findFirst({ where: { id: templateId, ...centerScope(scope), active: true } });
    if (!template) return notFound();

    const to = String(body.email || patient.guardianEmail || patient.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return NextResponse.json({ error: "Este usuario no tiene correo del tutor. Agrégalo en la ficha o escríbelo aquí." }, { status: 400 });
    }

    const centro = scope.centerId ? await prisma.center.findUnique({ where: { id: scope.centerId }, select: { name: true } }) : null;
    const texto = fillPlaceholders(template.body, {
      paciente: patient.name,
      tutor: patient.guardian || "",
      terapeuta: scope.name,
      centro: centro?.name ?? "",
      fecha: new Date().toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" }),
    });

    const token = randomBytes(24).toString("hex");
    const created = await prisma.consentRequest.create({
      data: { templateId, patientId, token, title: template.name, body: texto, sentTo: to, ...ownerFields(scope) },
    });

    const base = process.env.NEXTAUTH_URL || "https://app.todo-to.com";
    const link = `${base}/firmar/${token}`;
    const quien = centro?.name ?? scope.name;
    try {
      await sendEmail(
        to,
      `${template.name} — para leer y aceptar`,
      `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:24px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">Documento para leer y aceptar</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">
          <p style="color:#1e293b;margin:0 0 10px;">Hola${patient.guardian ? ` ${patient.guardian}` : ""},</p>
          <p style="color:#475569;margin:0 0 18px;line-height:1.5;">
            <strong>${quien}</strong> te envía el documento <strong>${template.name}</strong> sobre el proceso de ${patient.name}.
            Puedes leerlo con calma y aceptarlo con un clic. Queda registrado con fecha y hora.
          </p>
          <a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;">Leer el documento</a>
          <p style="color:#94a3b8;font-size:12px;margin:18px 0 0;">Si tienes dudas, responde a este correo o habla con tu terapeuta antes de aceptar.</p>
        </div>
      </div>`
      );
    } catch (err) {
      // Sin correo no hay envío: no dejamos un pendiente que la familia nunca verá
      console.error("Consent email error:", err);
      await prisma.consentRequest.delete({ where: { id: created.id } });
      return NextResponse.json({ error: "No se pudo enviar el correo a esa dirección. Revísala e inténtalo de nuevo." }, { status: 502 });
    }

    return NextResponse.json({ id: created.id, sentTo: to, link }, { status: 201 });
  } catch (err) {
    console.error("Consent send error:", err);
    return NextResponse.json({ error: "No se pudo enviar el documento" }, { status: 500 });
  }
}
