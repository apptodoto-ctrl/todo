import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { to, subject, html } = await req.json();

  if (!to || !subject || !html) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    await sendEmail(to, subject, html);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
