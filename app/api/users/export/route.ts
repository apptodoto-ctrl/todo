import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";

export async function GET() {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const email = session.email;
    const [user, patients, tasks, appointments, pipelines, documents] = await Promise.all([
      prisma.user.findUnique({
        where: { email },
        select: { name: true, email: true, role: true, phone: true, specialty: true, createdAt: true },
      }),
      prisma.patient.findMany({
        where: { createdBy: email },
        include: { sessionRecords: { orderBy: { date: "asc" } } },
      }),
      prisma.task.findMany({ where: { createdBy: email } }),
      prisma.appointment.findMany({ where: { createdBy: email } }),
      prisma.pipeline.findMany({
        where: { createdBy: email },
        include: { columns: { include: { cases: true }, orderBy: { order: "asc" } } },
      }),
      prisma.document.findMany({
        where: { createdBy: email },
        select: { name: true, category: true, size: true, type: true, createdAt: true },
      }),
    ]);

    const data = { exportedAt: new Date().toISOString(), user, patients, tasks, appointments, pipelines, documents };
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="todo-therapy-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo exportar" }, { status: 500 });
  }
}
