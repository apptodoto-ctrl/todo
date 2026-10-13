import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden } from "@/lib/apiAuth";
import { getScope } from "@/lib/center";
import { payrollFor } from "@/lib/centerPayroll";

/**
 * Lo que hay que pagarle a cada terapeuta este mes. Solo la Administradora
 * lo ve completo; cada terapeuta ve únicamente su propia fila.
 */
export async function GET(req: NextRequest) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (!scope.centerId) return forbidden();

  const now = new Date();
  const month = req.nextUrl.searchParams.get("month") || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const todos = await payrollFor(scope.centerId, month);
  const center = await prisma.center.findUnique({ where: { id: scope.centerId }, select: { currency: true } });

  const filas = scope.isAdmin ? todos : todos.filter((t) => t.email === scope.email);
  return NextResponse.json({
    month,
    currency: center?.currency ?? "CLP",
    isAdmin: scope.isAdmin,
    therapists: filas,
    totalGenerated: filas.reduce((a, t) => a + t.generated, 0),
    totalOwed: filas.reduce((a, t) => a + t.owed, 0),
  });
}
