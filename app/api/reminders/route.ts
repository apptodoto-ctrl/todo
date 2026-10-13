import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized } from "@/lib/apiAuth";
import { getScope, ownScope, ownerFields } from "@/lib/center";

export async function GET() {
  const scope = await getScope();
  if (!scope) return unauthorized();
  try {
    const reminders = await prisma.reminder.findMany({
      where: ownScope(scope),
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
    return NextResponse.json(reminders);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const scope = await getScope();
  if (!scope) return unauthorized();
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
        ...ownerFields(scope),
      },
    });
    return NextResponse.json(reminder, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
