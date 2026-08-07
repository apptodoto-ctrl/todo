import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: "Correo requerido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

    // Siempre responder success para no revelar qué correos están registrados
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: tokenHash,
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "https://app.todo-to.com";
    const resetUrl = `${baseUrl}/auth/reset?token=${token}`;

    await sendEmail(
      user.email,
      "Restablece tu contraseña — TOdo Therapy",
      `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9f5ff;border-radius:16px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#7c3aed);border-radius:12px;padding:12px 20px;">
              <span style="color:white;font-size:20px;font-weight:bold;">TOdo Therapy</span>
            </div>
          </div>
          <h2 style="color:#1e1b4b;margin-bottom:8px;">Restablecer contraseña</h2>
          <p style="color:#4c4469;">Hola ${user.name}, recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
          <p style="color:#4c4469;">Haz clic en el botón para crear una nueva contraseña. El enlace es válido por 1 hora.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;">Restablecer contraseña</a>
          </div>
          <p style="color:#9ca3af;font-size:12px;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br/><a href="${resetUrl}" style="color:#7c3aed;word-break:break-all;">${resetUrl}</a></p>
          <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">Si no solicitaste esto, puedes ignorar este correo.<br/>© 2026 TOdo Therapy</p>
        </div>
      `
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "No se pudo enviar el correo" }, { status: 500 });
  }
}
