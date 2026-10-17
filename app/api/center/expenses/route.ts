import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden } from "@/lib/apiAuth";
import { getScope } from "@/lib/center";

export const EXPENSE_CATEGORIES: Record<string, string> = {
  arriendo: "Arriendo",
  servicios: "Servicios (luz, agua, internet)",
  insumos: "Insumos y materiales",
  sueldos: "Sueldos y honorarios",
  marketing: "Marketing",
  software: "Software y suscripciones",
  impuestos: "Impuestos",
  otro: "Otro",
};

/** Gastos del mes del Centro; solo la Administradora */
export async function GET(req: NextRequest) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId || !scope.isAdmin) return forbidden();
  const month = req.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const expenses = await prisma.centerExpense.findMany({
    where: { centerId: scope.centerId, month },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
  const porCategoria: Record<string, number> = {};
  for (const e of expenses) porCategoria[e.category] = (porCategoria[e.category] ?? 0) + e.amount;
  return NextResponse.json({
    month,
    expenses,
    total: expenses.reduce((a, e) => a + e.amount, 0),
    porCategoria,
    categorias: EXPENSE_CATEGORIES,
  });
}

export async function POST(req: Request) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId || !scope.isAdmin) return forbidden();
  try {
    const body = await req.json();
    // "350.000" o "350,000" son miles; "25.5" se respeta
    const raw = typeof body.amount === "string" ? body.amount.replace(/[^\d.,-]/g, "").replace(/[.,](?=\d{3}(\D|$))/g, "").replace(",", ".") : body.amount;
    const amount = Math.round(Number(raw));
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Indica el monto del gasto" }, { status: 400 });
    const date = String(body.date ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Fecha no válida" }, { status: 400 });
    const created = await prisma.centerExpense.create({
      data: {
        centerId: scope.centerId,
        date,
        month: date.slice(0, 7),
        category: Object.keys(EXPENSE_CATEGORIES).includes(body.category) ? body.category : "otro",
        description: String(body.description ?? "").trim().slice(0, 200),
        amount,
        createdBy: scope.email,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar el gasto" }, { status: 500 });
  }
}
