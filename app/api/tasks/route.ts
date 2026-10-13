import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized } from "@/lib/apiAuth";
import { getScope, ownerFields, taskScope } from "@/lib/center";

export async function GET() {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const tasks = await prisma.task.findMany({
      where: taskScope(scope),
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(tasks.map((t) => ({ ...t, patient: t.patientName })));
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const body = await req.json();
    const { patient, patientId, ...rest } = body;
    delete rest.notifiedAt;
    delete rest.comment;

    // Asignar una tarea a otra persona del equipo es cosa de la Administradora
    let assignedTo = "";
    if (rest.assignedTo) {
      if (!scope.centerId || !scope.isAdmin) {
        return NextResponse.json({ error: "Solo la Administradora asigna tareas al equipo" }, { status: 403 });
      }
      const miembro = await prisma.centerMember.findFirst({
        where: { centerId: scope.centerId, userEmail: String(rest.assignedTo), active: true },
      });
      if (!miembro) return NextResponse.json({ error: "Esa terapeuta no está activa en el Centro" }, { status: 400 });
      assignedTo = miembro.userEmail;
    }
    delete rest.assignedTo;
    const task = await prisma.task.create({
      data: {
        ...rest,
        patientName: rest.patientName ?? patient ?? "",
        notify: rest.notify === true && !!rest.due,
        assignedTo,
        ...ownerFields(scope),
        ...(patientId ? { patientId: Number(patientId) } : {}),
      },
    });
    return NextResponse.json({ ...task, patient: task.patientName }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
