import { prisma } from "@/lib/db";

export type PayMode = "porcentaje" | "fijo_sesion" | "sueldo";

export const PAY_MODE_LABELS: Record<PayMode, string> = {
  porcentaje: "Porcentaje de cada sesión",
  fijo_sesion: "Monto fijo por sesión",
  sueldo: "Sueldo mensual fijo",
};

export interface TherapistPay {
  email: string;
  name: string;
  payMode: PayMode;
  payValue: number;
  sessions: number;
  generated: number;
  owed: number;
}

/** Lo que generó cada terapeuta en el mes y lo que hay que pagarle */
export async function payrollFor(centerId: string, month: string): Promise<TherapistPay[]> {
  const [members, patients] = await Promise.all([
    prisma.centerMember.findMany({
      where: { centerId, role: "terapeuta" },
      select: { userEmail: true, name: true, payMode: true, payValue: true },
    }),
    prisma.patient.findMany({
      where: { centerId },
      select: { id: true, sessionValue: true, therapistEmail: true },
    }),
  ]);

  const valorDe = new Map(patients.map((p) => [p.id, p.sessionValue || 0]));
  const terapeutaDe = new Map(patients.map((p) => [p.id, p.therapistEmail]));

  const sessions = await prisma.sessionRecord.findMany({
    where: { patientId: { in: patients.map((p) => p.id) }, date: { startsWith: month }, attended: true },
    select: { patientId: true, value: true, createdBy: true },
  });

  return members.map((m) => {
    // La sesión cuenta para quien la atendió; si no consta, para la terapeuta a cargo
    const suyas = sessions.filter((s) => (s.createdBy || terapeutaDe.get(s.patientId)) === m.userEmail);
    const generated = suyas.reduce(
      (acc, s) => acc + (s.value !== null && s.value !== undefined ? s.value : valorDe.get(s.patientId) ?? 0),
      0
    );
    const mode = (m.payMode as PayMode) ?? "porcentaje";
    const owed =
      mode === "porcentaje" ? Math.round((generated * m.payValue) / 100)
      : mode === "fijo_sesion" ? suyas.length * m.payValue
      : m.payValue;

    return {
      email: m.userEmail,
      name: m.name || m.userEmail,
      payMode: mode,
      payValue: m.payValue,
      sessions: suyas.length,
      generated,
      owed,
    };
  }).sort((a, b) => b.generated - a.generated);
}
