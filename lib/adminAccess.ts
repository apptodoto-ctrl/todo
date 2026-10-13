import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

/** El código vive 10 minutos */
const CODE_MINUTES = 10;
/** La sesión del panel se cierra sola a los 30 minutos sin uso */
export const PANEL_IDLE_MINUTES = 30;
/** Intentos seguidos fallidos antes de pedir un código nuevo */
const MAX_ATTEMPTS = 5;

/** Manda un código de verificación al correo de la cuenta de administración */
export async function sendAccessCode(email: string): Promise<void> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_MINUTES * 60 * 1000);

  await prisma.adminAccessCode.create({
    data: { email, codeHash: await bcrypt.hash(code, 10), expiresAt },
  });

  await sendEmail(
    email,
    `Tu código para entrar al panel: ${code}`,
    `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:460px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:22px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:19px;">Panel de administración</h1>
      </div>
      <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;text-align:center;">
        <p style="color:#475569;margin:0 0 16px;">Escribe este código para entrar:</p>
        <p style="font-size:34px;font-weight:bold;letter-spacing:7px;color:#1e293b;margin:0 0 16px;font-family:monospace;">${code}</p>
        <p style="color:#94a3b8;font-size:12px;margin:0;">Vence en ${CODE_MINUTES} minutos. Si no fuiste tú, ignora este correo y avisa al equipo.</p>
      </div>
    </div>`
  );
}

/** Comprueba el código: un solo uso, con límite de intentos */
export async function verifyAccessCode(email: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ahora = new Date();
  const reciente = await prisma.adminAccessCode.findFirst({
    where: { email, usedAt: null, expiresAt: { gt: ahora } },
    orderBy: { createdAt: "desc" },
  });
  if (!reciente) return { ok: false, error: "El código venció o ya se usó. Pide uno nuevo." };

  // Demasiados intentos con el mismo código: se invalida
  const intentos = await prisma.adminAccessCode.count({
    where: { email, createdAt: { gte: new Date(ahora.getTime() - CODE_MINUTES * 60 * 1000) } },
  });
  if (intentos > MAX_ATTEMPTS) {
    return { ok: false, error: "Demasiados intentos. Pide un código nuevo." };
  }

  const coincide = await bcrypt.compare(String(code ?? ""), reciente.codeHash);
  if (!coincide) return { ok: false, error: "Ese código no es correcto." };

  await prisma.adminAccessCode.update({ where: { id: reciente.id }, data: { usedAt: ahora } });
  return { ok: true };
}
