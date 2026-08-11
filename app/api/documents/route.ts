import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import { randomUUID } from "crypto";
import path from "path";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  const createdBy = session?.user?.email;
  if (!createdBy) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const docs = await prisma.document.findMany({
    where: { createdBy },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(docs);
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(req: NextRequest) {
  const session = await auth();
  const createdBy = session?.user?.email;
  if (!createdBy) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const category = (formData.get("category") as string) || "Sin categoría";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "El archivo supera el máximo de 20MB" }, { status: 413 });
  }

  const ext = path.extname(file.name);
  const key = `documents/${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadToR2(key, buffer, file.type || "application/octet-stream");

  const sizeKB = file.size / 1024;
  const sizeStr = sizeKB < 1024 ? `${Math.round(sizeKB)} KB` : `${(sizeKB / 1024).toFixed(1)} MB`;

  const doc = await prisma.document.create({
    data: {
      name: file.name,
      category,
      size: sizeStr,
      type: getFileType(file.name),
      key,
      url,
      createdBy,
    },
  });

  return NextResponse.json(doc, { status: 201 });
}

function getFileType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "doc";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) return "img";
  return "file";
}
