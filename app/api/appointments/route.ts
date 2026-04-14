import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const appointments = await prisma.appointment.findMany({ orderBy: { date: "asc" } });
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
