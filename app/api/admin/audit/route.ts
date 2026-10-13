import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/adminPanel";

/** Registro de cambios del panel. Solo se lee: nadie puede borrarlo. */
export async function GET(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const target = req.nextUrl.searchParams.get("target") ?? "";
  const action = req.nextUrl.searchParams.get("action") ?? "";

  const logs = await prisma.adminAuditLog.findMany({
    where: {
      ...(target ? { targetEmail: target } : {}),
      ...(action ? { action } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(logs);
}
