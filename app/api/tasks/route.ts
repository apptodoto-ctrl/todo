import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";

export async function GET() {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const tasks = await prisma.task.findMany({
      where: { createdBy: session.email },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(tasks.map((t) => ({ ...t, patient: t.patientName })));
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const body = await req.json();
    const { patient, patientId, ...rest } = body;
    delete rest.notifiedAt;
    const task = await prisma.task.create({
      data: {
        ...rest,
        patientName: rest.patientName ?? patient ?? "",
        notify: rest.notify === true && !!rest.due,
        createdBy: session.email,
        ...(patientId ? { patientId: Number(patientId) } : {}),
      },
    });
    return NextResponse.json({ ...task, patient: task.patientName }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
