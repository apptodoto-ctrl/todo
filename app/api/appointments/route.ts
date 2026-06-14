import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const createdBy = req.nextUrl.searchParams.get("createdBy") || "";
    const appointments = await prisma.appointment.findMany({
      where: createdBy ? { createdBy } : undefined,
      orderBy: { date: "asc" },
    });
    return NextResponse.json(appointments);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const appointment = await prisma.appointment.create({ data: body });
    return NextResponse.json(appointment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
