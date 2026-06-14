import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const createdBy = req.nextUrl.searchParams.get("createdBy") || "";
    const tasks = await prisma.task.findMany({
      where: createdBy ? { createdBy } : undefined,
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(tasks.map((t) => ({ ...t, patient: t.patientName })));
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { patient, patientId, ...rest } = body;
    const task = await prisma.task.create({
      data: {
        ...rest,
        ...(patientId ? { patientId: Number(patientId) } : {}),
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
