import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff, audit } from "@/lib/adminPanel";
import { COUNTRIES } from "@/lib/countries";

/** Ajustes del sistema que el equipo cambia sin programar */
const AJUSTES: { key: string; label: string; fallback: string; hint: string }[] = [
  { key: "trial_days", label: "Días de prueba gratis", fallback: "7", hint: "Cuánto dura la prueba de una cuenta nueva" },
  { key: "trial_credits", label: "Créditos de la prueba", fallback: "40", hint: "Créditos de IA que trae la prueba" },
  { key: "trial_tier", label: "Plan de la prueba", fallback: "profesional_30", hint: "Con qué plan arranca una cuenta nueva" },
  { key: "past_due_days", label: "Días para pagar tras un fallo", fallback: "10", hint: "Cuánto tiempo tiene el cliente antes de que se le corte" },
  { key: "retention_days", label: "Días que se guardan los datos", fallback: "90", hint: "Tras cancelar una cuenta, antes de borrarla" },
  { key: "max_file_mb", label: "Tamaño máximo de archivo (MB)", fallback: "20", hint: "Para los documentos de la biblioteca" },
  { key: "maintenance_notice", label: "Aviso de mantención", fallback: "", hint: "Mensaje que ven todos los clientes; déjalo vacío para quitarlo" },
];

export async function GET() {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const guardados = await prisma.pricingSetting.findMany({ where: { key: { in: AJUSTES.map((a) => a.key) } } });
  const porClave = new Map(guardados.map((g) => [g.key, g.value]));

  return NextResponse.json({
    settings: AJUSTES.map((a) => ({ ...a, value: porClave.get(a.key) ?? a.fallback })),
    countries: COUNTRIES,
  });
}

export async function PATCH(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    const body = await req.json();
    const key = String(body.key ?? "");
    const ajuste = AJUSTES.find((a) => a.key === key);
    if (!ajuste) return NextResponse.json({ error: "Ajuste desconocido" }, { status: 400 });

    const antes = await prisma.pricingSetting.findUnique({ where: { key } });
    const despues = await prisma.pricingSetting.upsert({
      where: { key },
      update: { value: String(body.value ?? "") },
      create: { key, value: String(body.value ?? ""), label: ajuste.label },
    });

    await audit({
      actor: String(body.actor ?? staff.name),
      action: "ajuste_sistema",
      before: { key, value: antes?.value ?? ajuste.fallback },
      after: { key, value: despues.value },
      reason: String(body.reason ?? ""),
    });

    return NextResponse.json(despues);
  } catch {
    return NextResponse.json({ error: "No se pudo guardar el ajuste" }, { status: 500 });
  }
}
