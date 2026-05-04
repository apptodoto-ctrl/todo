import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json(patients);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const patient = await prisma.patient.create({ data: body });
    return NextResponse.json(patient, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
