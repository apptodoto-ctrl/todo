import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";

export async function GET() {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const reminders = await prisma.reminder.findMany({
      where: { createdBy: session.email },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
    return NextResponse.json(reminders);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { title, description, date, time, type } = await req.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "El título es requerido" }, { status: 400 });
    }
    const reminder = await prisma.reminder.create({
      data: {
        title: title.trim(),
        description: description || "",
        date: date || "",
        time: time || "",
        type: type || "general",
        createdBy: session.email,
      },
    });
    return NextResponse.json(reminder, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
