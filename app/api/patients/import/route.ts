import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden } from "@/lib/apiAuth";
import { getBillingStatus, hasFullAccess } from "@/lib/billing";
import { getScope, patientScope, ownerFields, billingEmail, can, canManageMoney } from "@/lib/center";
import { readSheet, parseDate, ageFrom, initialsOf, IMPORT_COLUMNS, type ImportRow } from "@/lib/patientImport";

const MAX_ROWS = 500;
const normName = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/**
 * Importa usuarios desde una planilla. Con ?dryRun=1 solo revisa y devuelve
 * qué filas entrarían; sin él, las crea.
 */
export async function POST(req: NextRequest) {
  const scope = await getScope();
  if (!scope) return unauthorized();
  if (scope.centerId && !can(scope, "crearPacientes")) return forbidden();
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Adjunta la planilla" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "La planilla supera los 5 MB" }, { status: 413 });
    if (!/\.(xlsx|csv)$/i.test(file.name)) return NextResponse.json({ error: "Usa la planilla en Excel (.xlsx) o un .csv" }, { status: 400 });

    const { headers, mapping, rows } = await readSheet(Buffer.from(await file.arrayBuffer()), file.name);
    if (!mapping.includes("name")) {
      return NextResponse.json({ error: "No encontré la columna «Nombre completo». Descarga la planilla tipo y úsala como base." }, { status: 400 });
    }
    if (rows.length > MAX_ROWS) return NextResponse.json({ error: `Máximo ${MAX_ROWS} usuarios por planilla` }, { status: 400 });

    // Equipo del Centro, para validar la terapeuta a cargo
    const equipo = scope.centerId
      ? new Set((await prisma.centerMember.findMany({ where: { centerId: scope.centerId, active: true }, select: { userEmail: true } })).map((m) => m.userEmail))
      : new Set<string>();
    const existentes = await prisma.patient.findMany({ where: patientScope(scope), select: { name: true, rut: true } });
    const nombres = new Set(existentes.map((p) => normName(p.name)));
    const ruts = new Set(existentes.map((p) => p.rut.replace(/[.\s-]/g, "").toLowerCase()).filter(Boolean));
    const vistos = new Set<string>();
    const ejemplo = normName("María Pérez Soto");

    const parsed: ImportRow[] = rows.map((r, i) => {
      const data: Record<string, string> = {};
      const errors: string[] = [];
      let birthRaw: unknown = "";
      mapping.forEach((key, c) => {
        if (!key) return;
        const v = r[c];
        if (key === "birthDate") { birthRaw = v; return; }
        data[key] = v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").trim();
      });
      const name = (data.name ?? "").replace(/\s+/g, " ").trim();
      data.name = name;
      if (!name) errors.push("Falta el nombre");
      // La fila de pistas y la de ejemplo de la planilla tipo se saltan solas
      const esPista = /^obligatorio$/i.test(name) || /^dd[-/]mm[-/]aaaa$/i.test(String(birthRaw ?? "").trim());
      if (esPista) return { row: i + 1, data, errors: ["Fila de pistas"], duplicate: true };
      const bd = parseDate(birthRaw);
      if (bd === null) errors.push("Fecha de nacimiento no válida (usa DD-MM-AAAA)");
      data.birthDate = bd ?? "";
      if (data.sessionValue) {
        const n = Number(String(data.sessionValue).replace(/[^\d]/g, ""));
        if (!Number.isFinite(n)) errors.push("Valor sesión debe ser un número");
        data.sessionValue = String(n || 0);
      }
      if (data.status) {
        const s = normName(data.status);
        data.status = s.includes("eval") ? "evaluacion" : s === "alta" ? "alta" : s.startsWith("no") ? "no_continua" : "activo";
      }
      if (data.attendanceMode) data.attendanceMode = normName(data.attendanceMode).startsWith("dom") ? "domicilio" : "centro";
      if (data.prevision) {
        const p = normName(data.prevision);
        data.prevision = p.startsWith("pub") ? "Pública" : p.startsWith("priv") ? "Privada" : p.startsWith("part") ? "Particular" : "";
      }
      for (const k of ["guardianEmail", "email", "therapistEmail"]) {
        if (data[k]) { data[k] = data[k].toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data[k])) errors.push(`${k === "therapistEmail" ? "Correo de la terapeuta" : "Correo"} no válido`); }
      }
      if (data.therapistEmail) {
        if (!scope.centerId) data.therapistEmail = "";
        else if (!equipo.has(data.therapistEmail)) errors.push("Esa terapeuta no está en el equipo del Centro");
      }
      const key = normName(name);
      const rutKey = (data.rut ?? "").replace(/[.\s-]/g, "").toLowerCase();
      const duplicate = !!name && (nombres.has(key) || vistos.has(key) || (!!rutKey && ruts.has(rutKey)) || key === ejemplo);
      if (name) vistos.add(key);
      return { row: i + 1, data, errors, duplicate };
    });

    const validas = parsed.filter((p) => p.errors.length === 0 && !p.duplicate);

    // Tope del plan: se cuenta sobre lo que ya hay más lo que entraría
    let limit: number | null = null;
    if (!scope.platformAdmin) {
      const billing = await getBillingStatus(billingEmail(scope));
      if (!hasFullAccess(billing.effectiveStatus)) {
        return NextResponse.json({ error: "Tu período de prueba terminó. Elige un plan para importar usuarios.", code: "subscription_expired" }, { status: 402 });
      }
      if (billing.maxPatients !== null) {
        const count = await prisma.patient.count({ where: scope.centerId ? { centerId: scope.centerId } : { createdBy: scope.email } });
        limit = Math.max(0, billing.maxPatients - count);
      }
    }
    const caben = limit === null ? validas : validas.slice(0, limit);
    const fueraDeTope = validas.length - caben.length;

    if (dryRun) {
      return NextResponse.json({
        headers, recognized: mapping.filter(Boolean).length, unrecognized: headers.filter((_, i) => !mapping[i] && headers[i]),
        rows: parsed, willCreate: caben.length, duplicates: parsed.filter((p) => p.duplicate).length,
        withErrors: parsed.filter((p) => p.errors.length > 0 && !p.duplicate).length, overLimit: fueraDeTope,
      });
    }

    let created = 0;
    for (const p of caben) {
      const d = p.data;
      const birthDate = d.birthDate || "";
      await prisma.patient.create({
        data: {
          name: d.name,
          initials: initialsOf(d.name),
          age: birthDate ? ageFrom(birthDate) : Number(d.age) || 0,
          birthDate,
          rut: d.rut ?? "",
          diagnosis: d.diagnosis ?? "",
          guardian: d.guardian ?? "",
          guardianPhone: d.guardianPhone ?? "",
          guardianEmail: d.guardianEmail ?? "",
          prevision: d.prevision ?? "",
          coverageEntity: d.coverageEntity ?? "",
          sessionValue: canManageMoney(scope) ? Number(d.sessionValue) || 0 : 0,
          consultReason: d.consultReason ?? "",
          school: d.school ?? "",
          status: d.status || "activo",
          attendanceMode: d.attendanceMode || "centro",
          homeAddress: d.homeAddress ?? "",
          phone: d.phone ?? "",
          email: d.email ?? "",
          ...ownerFields(scope),
          therapistEmail: d.therapistEmail || scope.email,
        },
      });
      created++;
    }
    return NextResponse.json({ created, duplicates: parsed.filter((p) => p.duplicate).length, withErrors: parsed.filter((p) => p.errors.length > 0 && !p.duplicate).length, overLimit: fueraDeTope, columns: IMPORT_COLUMNS.length });
  } catch (err) {
    console.error("Patient import error:", err);
    return NextResponse.json({ error: "No se pudo leer la planilla. Revisa que sea la planilla tipo en Excel." }, { status: 500 });
  }
}
