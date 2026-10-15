import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, loadPatient, canManageMoney } from "@/lib/center";
import { consumeFromPackage } from "@/lib/sessionPackages";

type Params = Promise<{ id: string }>;

async function checkOwnership(patientId: number) {
  // El acceso lo decide el alcance: cuenta individual o Centro con permisos
  const scope = await getScope();
  if (!scope) return unauthorized();
  const { status } = await loadPatient(scope, patientId);
  if (status === 404) return notFound();
  if (status === 403) return forbidden();
  return null;
}

async function syncSessionCount(patientId: number) {
  const count = await prisma.sessionRecord.count({ where: { patientId } });
  await prisma.patient.update({ where: { id: patientId }, data: { sessions: count } });
  return count;
}

export async function GET(_: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const patientId = Number(id);
    const err = await checkOwnership(patientId);
    if (err) return err;
    const records = await prisma.sessionRecord.findMany({
      where: { patientId },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    });
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id } = await params;
    const patientId = Number(id);
    const err = await checkOwnership(patientId);
    if (err) return err;
    const body = await req.json();
    const { date, notes, duration, attended } = body;
    // Una terapeuta del Centro registra la sesión; lo cobrado lo pone la Administradora
    const scopeAhora = await getScope();
    const dinero = scopeAhora && canManageMoney(scopeAhora);
    const paid = dinero ? body.paid : undefined;
    const value = dinero ? body.value : undefined;
    if (!date) {
      return NextResponse.json({ error: "La fecha es requerida" }, { status: 400 });
    }
    const record = await prisma.sessionRecord.create({
      data: {
        patientId,
        date,
        notes: notes || "",
        therapist: session.name,
        createdBy: session.email,
        duration: duration ? Number(duration) : 45,
        attended: attended !== false,
        paid: paid === true,
        value: value === "" || value === undefined || value === null ? null : Number(value),
      },
    });
    // Si el paciente tiene un paquete vigente, la sesión se descuenta de ahí
    let usedPackage = null;
    if (record.attended) {
      usedPackage = await consumeFromPackage(record.id, patientId);
    }
    const saved = usedPackage ? await prisma.sessionRecord.findUnique({ where: { id: record.id } }) : record;
    const sessions = await syncSessionCount(patientId);
    return NextResponse.json({ ...saved, sessions, usedPackage: usedPackage?.id ?? null }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
