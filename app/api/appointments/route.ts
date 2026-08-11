import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";

export async function GET() {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const appointments = await prisma.appointment.findMany({
      where: { createdBy: session.email },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(appointments);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const body = await req.json();
    const appointment = await prisma.appointment.create({
      data: { ...body, createdBy: session.email },
    });
    return NextResponse.json(appointment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
