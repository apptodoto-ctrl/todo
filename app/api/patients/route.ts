import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";

export async function GET() {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const patients = await prisma.patient.findMany({
      where: { createdBy: session.email },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(patients);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const body = await req.json();
    const patient = await prisma.patient.create({
      data: { ...body, createdBy: session.email },
    });
    return NextResponse.json(patient, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
