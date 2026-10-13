import { NextResponse } from "next/server";
import { requireStaff, audit } from "@/lib/adminPanel";
import { sendAccessCode, verifyAccessCode, PANEL_IDLE_MINUTES } from "@/lib/adminAccess";

/** Pide el código de verificación */
export async function POST() {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    await sendAccessCode(staff.email);
    return NextResponse.json({ ok: true, sentTo: staff.email, idleMinutes: PANEL_IDLE_MINUTES });
  } catch (err) {
    console.error("Admin access code error:", err);
    return NextResponse.json({ error: "No se pudo enviar el código" }, { status: 500 });
  }
}

/** Comprueba el código y abre el panel */
export async function PUT(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    const { code, actor } = await req.json();
    const r = await verifyAccessCode(staff.email, String(code ?? ""));
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 401 });

    await audit({ actor: String(actor ?? staff.name), action: "entrar_panel", targetEmail: "" });
    return NextResponse.json({ ok: true, idleMinutes: PANEL_IDLE_MINUTES });
  } catch {
    return NextResponse.json({ error: "No se pudo verificar el código" }, { status: 500 });
  }
}
