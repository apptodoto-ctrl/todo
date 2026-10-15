import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { archiveAcceptedConsent } from "@/lib/consents";

type Params = Promise<{ token: string }>;

async function porToken(token: string) {
  if (!token || token.length < 16) return null;
  return prisma.consentRequest.findUnique({
    where: { token },
    include: { patient: { select: { name: true } }, center: { select: { name: true } } },
  });
}

/** Lo que ve la familia: el documento y si ya está aceptado. Sin sesión. */
export async function GET(_: Request, { params }: { params: Params }) {
  const { token } = await params;
  const r = await porToken(token);
  if (!r) return NextResponse.json({ error: "Este enlace no es válido" }, { status: 404 });
  const therapist = await prisma.user.findUnique({ where: { email: r.createdBy }, select: { name: true } });
  return NextResponse.json({
    title: r.title,
    body: r.body,
    patientName: r.patient.name,
    from: r.center?.name ?? therapist?.name ?? "",
    sentTo: r.sentTo,
    sentAt: r.sentAt,
    accepted: !!r.acceptedAt,
    acceptedAt: r.acceptedAt,
    acceptedName: r.acceptedName,
  });
}

/** La familia acepta: queda fecha, hora y correo, y el documento va a la biblioteca */
export async function POST(req: Request, { params }: { params: Params }) {
  const { token } = await params;
  const r = await porToken(token);
  if (!r) return NextResponse.json({ error: "Este enlace no es válido" }, { status: 404 });
  if (r.acceptedAt) return NextResponse.json({ ok: true, alreadyAccepted: true, acceptedAt: r.acceptedAt });

  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!name) return NextResponse.json({ error: "Escribe tu nombre" }, { status: 400 });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Escribe un correo válido" }, { status: 400 });
    if (body.accept !== true) return NextResponse.json({ error: "Debes marcar que leíste y aceptas el documento" }, { status: 400 });

    const acceptedAt = new Date();
    await prisma.consentRequest.update({ where: { id: r.id }, data: { acceptedAt, acceptedName: name.slice(0, 120), acceptedEmail: email } });
    // La aceptación ya quedó registrada; si el archivo falla, se genera la próxima vez que la terapeuta abra la ficha
    let documentId: number | null = null;
    try { documentId = await archiveAcceptedConsent(r.id); } catch (err) { console.error("Consent archive error:", err); }
    return NextResponse.json({ ok: true, acceptedAt, documentId });
  } catch (err) {
    console.error("Consent accept error:", err);
    return NextResponse.json({ error: "No se pudo registrar la aceptación" }, { status: 500 });
  }
}
