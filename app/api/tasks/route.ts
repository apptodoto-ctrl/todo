import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized } from "@/lib/apiAuth";
import { getScope, ownScope, ownerFields } from "@/lib/center";

export async function GET() {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const tasks = await prisma.task.findMany({
      where: ownScope(scope),
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
    const task = await prisma.task.create({
      data: {
        ...rest,
        patientName: rest.patientName ?? patient ?? "",
        notify: rest.notify === true && !!rest.due,
        ...ownerFields(scope),
        ...(patientId ? { patientId: Number(patientId) } : {}),
      },
    });
    return NextResponse.json({ ...task, patient: task.patientName }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
