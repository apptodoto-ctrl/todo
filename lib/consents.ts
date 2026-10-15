import { prisma } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";

export const CONSENT_KINDS: Record<string, string> = {
  consentimiento: "Consentimiento informado",
  compromiso: "Compromiso terapéutico",
  cancelacion: "Política de cancelación y recuperación",
  terminos: "Términos y condiciones del servicio",
  devolucion: "Política de devolución y reembolso",
  otro: "Otro documento",
};

/**
 * Rellena los datos del paciente y la terapeuta en el texto. Los campos van
 * entre llaves dobles para que la terapeuta los vea al editar la plantilla.
 */
export function fillPlaceholders(
  body: string,
  data: { paciente: string; tutor: string; terapeuta: string; centro: string; fecha: string }
): string {
  return body
    .replace(/\{\{\s*paciente\s*\}\}/gi, data.paciente)
    .replace(/\{\{\s*tutor\s*\}\}/gi, data.tutor || "la familia")
    .replace(/\{\{\s*terapeuta\s*\}\}/gi, data.terapeuta)
    .replace(/\{\{\s*centro\s*\}\}/gi, data.centro || data.terapeuta)
    .replace(/\{\{\s*fecha\s*\}\}/gi, data.fecha);
}

function esc(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Documento aceptado, como archivo HTML imprimible que queda en la biblioteca */
export function acceptedDocumentHtml(params: {
  title: string;
  body: string;
  patientName: string;
  therapistName: string;
  centerName: string;
  acceptedName: string;
  acceptedEmail: string;
  acceptedAt: Date;
  sentAt: Date;
}): string {
  const cuando = params.acceptedAt.toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" });
  const enviado = params.sentAt.toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" });
  const parrafos = params.body.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br/>")}</p>`).join("");
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(params.title)}</title><style>
    body{font-family:Georgia,'Times New Roman',serif;max-width:720px;margin:36px auto;padding:0 24px;color:#1e293b;line-height:1.65}
    .cab{font-family:Arial,sans-serif;display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #7c3aed;padding-bottom:10px;margin-bottom:22px}
    .marca{font-weight:bold;color:#7c3aed;font-size:18px}.quien{font-size:11px;color:#475569;text-align:right}
    h1{font-size:20px;margin:0 0 4px}.meta{font-family:Arial,sans-serif;font-size:12px;color:#64748b;margin-bottom:22px}
    p{margin:0 0 12px;font-size:14px}
    .firma{font-family:Arial,sans-serif;margin-top:34px;border:1px solid #c4b5fd;background:#f5f3ff;border-radius:10px;padding:14px 16px;font-size:12.5px;color:#312e81}
    .firma strong{display:block;font-size:13px;margin-bottom:6px}
    @media print{body{margin:14px auto}}
  </style></head><body>
    <div class="cab"><div class="marca">TOdo Therapy</div><div class="quien"><strong>${esc(params.centerName || params.therapistName)}</strong><br/>${esc(params.therapistName)}</div></div>
    <h1>${esc(params.title)}</h1>
    <div class="meta">Usuario: ${esc(params.patientName)} · Enviado el ${esc(enviado)}</div>
    ${parrafos}
    <div class="firma">
      <strong>Aceptado en línea</strong>
      ${esc(params.acceptedName)} (${esc(params.acceptedEmail)}) leyó y aceptó este documento el ${esc(cuando)}.
      <br/>Este registro fue generado automáticamente por TOdo Therapy al momento de la aceptación.
    </div>
  </body></html>`;
}

/** Guarda el documento aceptado en la biblioteca, asociado al usuario */
export async function archiveAcceptedConsent(requestId: number): Promise<number | null> {
  const req = await prisma.consentRequest.findUnique({
    where: { id: requestId },
    include: { patient: { select: { id: true, name: true, createdBy: true, centerId: true } }, center: { select: { name: true } } },
  });
  if (!req || !req.acceptedAt) return null;
  const therapist = await prisma.user.findUnique({ where: { email: req.createdBy }, select: { name: true } });

  const html = acceptedDocumentHtml({
    title: req.title,
    body: req.body,
    patientName: req.patient.name,
    therapistName: therapist?.name ?? req.createdBy,
    centerName: req.center?.name ?? "",
    acceptedName: req.acceptedName,
    acceptedEmail: req.acceptedEmail,
    acceptedAt: req.acceptedAt,
    sentAt: req.sentAt,
  });
  const buffer = Buffer.from(html, "utf-8");
  const key = `consents/${req.token}.html`;
  const url = await uploadToR2(key, buffer, "text/html; charset=utf-8");
  const kb = buffer.length / 1024;

  const doc = await prisma.document.create({
    data: {
      name: `${req.title} — aceptado ${req.acceptedAt.toLocaleDateString("es-CL")}.html`,
      category: "Consentimientos",
      size: kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`,
      type: "file",
      key,
      url,
      patientId: req.patientId,
      createdBy: req.createdBy,
      ...(req.centerId ? { centerId: req.centerId } : {}),
    },
  });
  await prisma.consentRequest.update({ where: { id: req.id }, data: { documentId: doc.id } });
  return doc.id;
}

/**
 * Documentos tipo, listos para usar o editar. Son un punto de partida
 * razonable; cada terapeuta o Centro los ajusta a su realidad y su país.
 */
export const DEFAULT_CONSENTS: { name: string; kind: string; body: string }[] = [
  {
    name: "Consentimiento informado",
    kind: "consentimiento",
    body: `Yo, {{tutor}}, en calidad de madre, padre o tutor/a de {{paciente}}, declaro que he sido informado/a sobre el proceso de evaluación e intervención en terapia ocupacional que realizará {{terapeuta}} en {{centro}}.

Entiendo que la intervención tiene como objetivo favorecer el desempeño ocupacional y la participación de {{paciente}} en sus actividades cotidianas, y que los resultados dependen de la constancia en la asistencia y del trabajo conjunto entre la familia y el equipo.

Autorizo la realización de las evaluaciones y actividades terapéuticas que el profesional considere pertinentes, y el registro de la información clínica necesaria para el seguimiento del proceso. Esta información es confidencial y solo se compartirá con terceros con mi autorización expresa, salvo obligación legal.

Sé que puedo hacer preguntas en cualquier momento y que puedo retirar este consentimiento cuando lo estime conveniente, comunicándolo al profesional a cargo.

Fecha: {{fecha}}`,
  },
  {
    name: "Compromiso terapéutico",
    kind: "compromiso",
    body: `Este documento establece los compromisos entre {{centro}} y la familia de {{paciente}} para que el proceso terapéutico funcione.

Compromisos del profesional:
- Planificar y realizar las sesiones con objetivos claros, informados a la familia.
- Entregar orientaciones para la casa y responder las dudas en un plazo razonable.
- Informar los avances de forma periódica y emitir los informes acordados.
- Resguardar la confidencialidad de toda la información.

Compromisos de la familia:
- Asistir puntualmente a las sesiones agendadas.
- Avisar con anticipación si no podrán asistir, según la política de cancelación.
- Participar en las actividades sugeridas para la casa.
- Mantener al profesional informado de cambios relevantes en la salud o rutina de {{paciente}}.
- Mantener al día los pagos acordados.

Firmado por {{tutor}}, tutor/a de {{paciente}}, el {{fecha}}.`,
  },
  {
    name: "Política de cancelación y recuperación",
    kind: "cancelacion",
    body: `Para que todas las familias tengan acceso a su horario, {{centro}} aplica las siguientes reglas sobre cancelaciones y sesiones perdidas:

1. Las cancelaciones deben avisarse con al menos 24 horas de anticipación. Una sesión cancelada con menos aviso se considera realizada para efectos de cobro.

2. Una sesión perdida con aviso oportuno puede recuperarse dentro de los 15 días siguientes, según la disponibilidad del profesional.

3. Se permite un máximo de 2 cambios de horario por mes. Los cambios adicionales se tratarán como sesiones no asistidas.

4. Si la cancelación es por parte del profesional, la sesión se reagenda sin costo.

5. Tres inasistencias sin aviso en un mismo mes dan derecho al profesional a liberar el horario reservado.

{{tutor}}, tutor/a de {{paciente}}, declara conocer y aceptar estas condiciones el {{fecha}}.`,
  },
  {
    name: "Términos y condiciones del servicio",
    kind: "terminos",
    body: `Al aceptar este documento, {{tutor}} contrata los servicios de terapia ocupacional de {{centro}} para {{paciente}} bajo las siguientes condiciones:

Modalidad: las sesiones se realizan en el lugar y horario acordados en la agenda. Cualquier cambio se coordina directamente con el profesional.

Valor y forma de pago: el valor de cada sesión o paquete es el informado al momento de contratar. Los pagos se realizan según lo acordado (mensual anticipado, por sesión o por paquete).

Duración: el proceso no tiene una duración fija; depende de los objetivos y la evolución de {{paciente}}. El profesional informará cuando corresponda dar el alta o derivar.

Informes: los informes se emiten según lo acordado. La solicitud de informes adicionales puede tener un costo informado previamente.

Datos personales: la información se usa exclusivamente para el proceso terapéutico y se resguarda según la legislación vigente.

Aceptado el {{fecha}}.`,
  },
  {
    name: "Política de devolución y reembolso",
    kind: "devolucion",
    body: `{{centro}} aplica las siguientes reglas para devoluciones y reembolsos:

1. Las sesiones individuales pagadas y no utilizadas por cancelación oportuna de la familia se pueden recuperar dentro del plazo de la política de cancelación; no se devuelven en dinero.

2. Los paquetes de sesiones son prepagados. Si la familia decide terminar el proceso antes de usar todas las sesiones, se reembolsará el valor de las sesiones no utilizadas descontando el costo administrativo informado, siempre que el paquete esté dentro de su vigencia.

3. Si el proceso termina por decisión del profesional, se reembolsa el total de las sesiones no utilizadas.

4. Las devoluciones se realizan por el mismo medio de pago, en un plazo de hasta 10 días hábiles.

{{tutor}}, tutor/a de {{paciente}}, acepta estas condiciones el {{fecha}}.`,
  },
];
