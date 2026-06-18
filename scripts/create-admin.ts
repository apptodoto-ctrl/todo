import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.pipeline.findMany({
    select: { id: true, name: true, createdBy: true },
  });
  console.table(rows);

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });
  console.table(users);

  await prisma.$disconnect();
}

main();
