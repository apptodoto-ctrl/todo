import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized, forbidden, notFound } from "@/lib/apiAuth";
import { getScope, loadPatient, canManageMoney } from "@/lib/center";
import { refreshPackageStatus } from "@/lib/sessionPackages";

type Params = Promise<{ id: string; sessionId: string }>;

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

export async function PUT(req: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id, sessionId } = await params;
    const err = await checkOwnership(Number(id));
    if (err) return err;
    const { date, notes, duration, attended, paid, confirmed, packageId, value, paymentMethod } = await req.json();

    // En un Centro, pagos, valores y paquetes los toca solo la Administradora
    const scopeAhora = await getScope();
    const tocaDinero = paid !== undefined || value !== undefined || packageId !== undefined;
    if (tocaDinero && scopeAhora && !canManageMoney(scopeAhora)) {
      return NextResponse.json(
        { error: "En el Centro, los pagos y los valores los registra la Administradora." },
        { status: 403 }
      );
    }

    // Asignar la sesión a un paquete a mano (o soltarla) desde la ficha
    const current = await prisma.sessionRecord.findUnique({ where: { id: Number(sessionId) }, select: { packageId: true } });
    const previousPackageId = current?.packageId ?? null;
    let packagePatch = {};
    if (packageId !== undefined) {
      if (packageId === null || packageId === "") {
        packagePatch = { packageId: null };
      } else {
        const pkg = await prisma.sessionPackage.findUnique({ where: { id: Number(packageId) } });
        if (!pkg || pkg.patientId !== Number(id)) {
          return NextResponse.json({ error: "Ese paquete no es de este usuario" }, { status: 400 });
        }
        packagePatch = { packageId: pkg.id, ...(pkg.paid ? { paid: true } : {}) };
      }
    }

    const record = await prisma.sessionRecord.update({
      where: { id: Number(sessionId) },
      data: {
        ...packagePatch,
        ...(date !== undefined ? { date } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(duration !== undefined ? { duration: Number(duration) } : {}),
        ...(attended !== undefined ? { attended: attended === true } : {}),
        ...(paid !== undefined
          ? {
              paid: paid === true,
              ...(paid === true
                ? { paidAt: new Date(), paidBy: scopeAhora?.email ?? "", ...(paymentMethod ? { paymentMethod: String(paymentMethod).slice(0, 30) } : {}) }
                : { paidAt: null, paidBy: "", paymentMethod: "" }),
            }
          : {}),
        ...(value !== undefined ? { value: value === "" || value === null ? null : Number(value) } : {}),
        // Cualquier edición de la terapeuta da por confirmada la sesión automática
        ...(confirmed !== undefined ? { confirmed: confirmed === true } : { confirmed: true }),
      },
    });
    // Mover una sesión entre paquetes cambia cuántas quedan en cada uno
    if (packageId !== undefined) {
      const touched = new Set<number>();
      if (previousPackageId) touched.add(previousPackageId);
      if (record.packageId) touched.add(record.packageId);
      for (const pid of touched) await refreshPackageStatus(pid);
    }
    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { id, sessionId } = await params;
    const patientId = Number(id);
    const err = await checkOwnership(patientId);
    if (err) return err;
    await prisma.sessionRecord.delete({ where: { id: Number(sessionId) } });
    const sessions = await syncSessionCount(patientId);
    return NextResponse.json({ ok: true, sessions });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
