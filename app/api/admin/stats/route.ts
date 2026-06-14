import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, patients, tasks, appointments, documents] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.patient.count(),
    prisma.task.count(),
    prisma.appointment.count(),
    prisma.document.count(),
  ]);

  // Per-user counts
  const [patientCounts, taskCounts] = await Promise.all([
    prisma.patient.groupBy({ by: ["createdBy"], _count: { id: true } }),
    prisma.task.groupBy({ by: ["createdBy"], _count: { id: true } }),
  ]);

  const patientMap = Object.fromEntries(patientCounts.map((r) => [r.createdBy, r._count.id]));
  const taskMap = Object.fromEntries(taskCounts.map((r) => [r.createdBy, r._count.id]));

  const usersWithCounts = users.map((u) => ({
    ...u,
    patientCount: patientMap[u.email] ?? 0,
    taskCount: taskMap[u.email] ?? 0,
  }));

  return NextResponse.json({
    totalUsers: users.length,
    totalPatients: patients,
    totalTasks: tasks,
    totalAppointments: appointments,
    totalDocuments: documents,
    users: usersWithCounts,
  });
}
