import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const password = process.argv[2] ?? randomBytes(10).toString("base64url");
  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email: "japieaters@gmail.com" },
    update: { password: hashed, role: "admin", name: "Josefina" },
    create: { email: "japieaters@gmail.com", password: hashed, name: "Josefina", role: "admin" },
  });

  console.log("✅ Cuenta creada:", user.email, "| rol:", user.role);
  console.log("🔑 Contraseña:", password);
  await prisma.$disconnect();
}

main();
