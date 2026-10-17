import ExcelJS from "exceljs";

/** Columnas de la planilla tipo, en el orden en que se descargan */
export const IMPORT_COLUMNS: { key: string; header: string; hint: string; width: number }[] = [
  { key: "name", header: "Nombre completo", hint: "Obligatorio", width: 30 },
  { key: "birthDate", header: "Fecha de nacimiento", hint: "DD-MM-AAAA", width: 18 },
  { key: "rut", header: "RUT / DNI / Cédula", hint: "", width: 18 },
  { key: "diagnosis", header: "Diagnóstico", hint: "", width: 28 },
  { key: "guardian", header: "Nombre del tutor", hint: "", width: 26 },
  { key: "guardianPhone", header: "Teléfono del tutor", hint: "", width: 18 },
  { key: "guardianEmail", header: "Correo del tutor", hint: "Para enviar documentos", width: 28 },
  { key: "prevision", header: "Previsión", hint: "Pública, Privada o Particular", width: 16 },
  { key: "coverageEntity", header: "Entidad", hint: "Fonasa, Isapre, OSDE, EPS...", width: 20 },
  { key: "sessionValue", header: "Valor sesión", hint: "Solo número", width: 14 },
  { key: "consultReason", header: "Motivo de consulta", hint: "", width: 34 },
  { key: "school", header: "Colegio o jardín", hint: "", width: 24 },
  { key: "status", header: "Estado", hint: "activo, evaluacion, alta o no continua", width: 14 },
  { key: "attendanceMode", header: "Lugar de atención", hint: "centro o domicilio", width: 18 },
  { key: "homeAddress", header: "Dirección", hint: "Si se atiende a domicilio", width: 30 },
  { key: "therapistEmail", header: "Correo de la terapeuta", hint: "Solo Centros; si va vacío queda a cargo de quien importa", width: 30 },
];

export interface ImportRow {
  row: number;
  data: Record<string, string>;
  errors: string[];
  duplicate: boolean;
}

const norm = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Reconoce cada columna por lo que dice el encabezado, aunque la escriban distinto */
export function matchHeader(header: string): string | null {
  const h = norm(header);
  if (!h) return null;
  if (h.includes("tutor") || h.includes("apoderad") || h.includes("madre") || h.includes("padre")) {
    if (h.includes("tel") || h.includes("fono") || h.includes("cel") || h.includes("whats")) return "guardianPhone";
    if (h.includes("correo") || h.includes("mail")) return "guardianEmail";
    return "guardian";
  }
  if (h.includes("terapeuta") || h.includes("profesional")) return "therapistEmail";
  if (h.includes("nacimiento") || h === "fecha nac" || h.includes("fecha de nac")) return "birthDate";
  if (h.includes("nombre")) return "name";
  if (h.includes("rut") || h.includes("dni") || h.includes("cedula") || h.includes("documento") || h.includes("identific")) return "rut";
  if (h.includes("diagn")) return "diagnosis";
  if (h.includes("previs") || h.includes("cobertura")) return "prevision";
  if (h.includes("entidad") || h.includes("isapre") || h.includes("obra social") || h.includes("eps")) return "coverageEntity";
  if (h.includes("valor") || h.includes("precio") || h.includes("tarifa")) return "sessionValue";
  if (h.includes("motivo")) return "consultReason";
  if (h.includes("colegio") || h.includes("escuela") || h.includes("jardin")) return "school";
  if (h.includes("estado")) return "status";
  if (h.includes("lugar") || h.includes("atencion") || h.includes("modalidad")) return "attendanceMode";
  if (h.includes("direcc") || h.includes("domicilio")) return "homeAddress";
  if (h.includes("edad")) return "age";
  if (h.includes("tel") || h.includes("fono") || h.includes("cel")) return "phone";
  if (h.includes("correo") || h.includes("mail")) return "email";
  return null;
}

/** Acepta DD-MM-AAAA, DD/MM/AAAA, AAAA-MM-DD o una fecha de Excel; devuelve AAAA-MM-DD */
export function parseDate(raw: unknown): string | null {
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return `${raw.getUTCFullYear()}-${String(raw.getUTCMonth() + 1).padStart(2, "0")}-${String(raw.getUTCDate()).padStart(2, "0")}`;
  }
  const t = String(raw ?? "").trim();
  if (!t) return "";
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (m) { const y = Number(m[3]); return `${y > 30 ? 1900 + y : 2000 + y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
  return null;
}

export function ageFrom(birthDate: string): number {
  const d = new Date(birthDate + "T00:00:00");
  if (isNaN(d.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return Math.max(0, age);
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase() || "?";
}

function cellText(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v) return v.text;
    if ("result" in v) return v.result ?? "";
    if ("hyperlink" in v) { const h = v as { text?: unknown; hyperlink: string }; return h.text ?? h.hyperlink; }
  }
  return v;
}

/** Lee la planilla (xlsx o csv) y devuelve filas crudas con los encabezados reconocidos */
export async function readSheet(buffer: Buffer, filename: string): Promise<{ headers: string[]; mapping: (string | null)[]; rows: unknown[][] }> {
  let grid: unknown[][] = [];
  if (/\.csv$/i.test(filename)) {
    grid = parseCsv(buffer.toString("utf-8").replace(/^﻿/, ""));
  } else {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) return { headers: [], mapping: [], rows: [] };
    ws.eachRow((row) => {
      const vals: unknown[] = [];
      for (let c = 1; c <= ws.columnCount; c++) vals.push(cellText(row.getCell(c).value));
      grid.push(vals);
    });
  }
  // La fila de encabezados es la primera que reconoce "nombre"
  const headerIdx = grid.findIndex((r) => r.some((c) => matchHeader(String(c ?? "")) === "name"));
  if (headerIdx < 0) return { headers: [], mapping: [], rows: [] };
  const headers = grid[headerIdx].map((c) => String(c ?? "").trim());
  const mapping = headers.map(matchHeader);
  const rows = grid.slice(headerIdx + 1).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  return { headers, mapping, rows };
}

function parseCsv(text: string): string[][] {
  const sep = (text.split("\n")[0]?.split(";").length ?? 0) > (text.split("\n")[0]?.split(",").length ?? 0) ? ";" : ",";
  const out: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); out.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out;
}

/** Planilla tipo con encabezados, una fila de ejemplo y notas */
export async function buildTemplate(isCenter: boolean): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "TOdo Therapy";
  const ws = wb.addWorksheet("Usuarios");
  const cols = IMPORT_COLUMNS.filter((c) => isCenter || c.key !== "therapistEmail");
  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } };
  head.alignment = { vertical: "middle" };
  head.height = 22;
  const hints = ws.addRow(cols.map((c) => c.hint));
  hints.font = { italic: true, color: { argb: "FF64748B" }, size: 9 };
  ws.addRow({
    name: "María Pérez Soto", birthDate: "12-03-2019", rut: "", diagnosis: "TEA nivel 1", guardian: "Carolina Soto",
    guardianPhone: "+56 9 1234 5678", guardianEmail: "carolina@correo.cl", prevision: "Privada", coverageEntity: "Isapre",
    sessionValue: 35000, consultReason: "Dificultades en motricidad fina y regulación", school: "Jardín Los Pinos",
    status: "activo", attendanceMode: "centro", homeAddress: "", therapistEmail: "",
  });
  ws.getRow(3).font = { color: { argb: "FF94A3B8" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const notas = wb.addWorksheet("Cómo llenar");
  notas.getColumn(1).width = 100;
  [
    "Cómo importar usuarios a TOdo Therapy",
    "",
    "1. Llena la hoja «Usuarios», una fila por usuario. Solo el nombre es obligatorio.",
    "2. La fila 2 son pistas y la fila 3 es un ejemplo: bórralas o déjalas, el sistema las salta.",
    "3. Fechas como DD-MM-AAAA (12-03-2019). También sirve una fecha de Excel.",
    "4. Valor sesión: solo el número, sin puntos ni símbolo (35000).",
    "5. Estado: activo, evaluacion, alta o no continua. Si va vacío queda activo.",
    "6. Lugar de atención: centro o domicilio. Si va vacío, centro.",
    isCenter ? "7. Correo de la terapeuta: debe ser alguien del equipo; si va vacío, el usuario queda a cargo de quien importa." : "",
    "",
    "Antes de guardar, TOdo te muestra qué filas entrarán y cuáles tienen problemas. Los usuarios que ya existen (mismo nombre) se saltan.",
  ].forEach((t, i) => { const r = notas.addRow([t]); if (i === 0) r.font = { bold: true, size: 13, color: { argb: "FF7C3AED" } }; });

  return Buffer.from(await wb.xlsx.writeBuffer());
}
