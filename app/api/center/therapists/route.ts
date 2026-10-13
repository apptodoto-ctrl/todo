import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized } from "@/lib/apiAuth";
import { getScope } from "@/lib/center";

/**
 * Terapeutas activas del Centro, para elegir quién queda a cargo de un
 * paciente y para filtrar la agenda. Una cuenta individual recibe solo
 * su propio nombre.
 */
export async function GET() {
  const scope = await getScope();
  if (!scope) return unauthorized();

  if (!scope.centerId) {
    return NextResponse.json([{ email: scope.email, name: scope.name, role: "individual" }]);
  }

  const members = await prisma.centerMember.findMany({
    where: { centerId: scope.centerId, active: true, joinedAt: { not: null } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { userEmail: true, name: true, role: true },
  });

  return NextResponse.json(
    members.map((m) => ({ email: m.userEmail, name: m.name || m.userEmail, role: m.role }))
  );
}
