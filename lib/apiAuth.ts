import { auth } from "@/auth";
import { NextResponse } from "next/server";

export interface SessionInfo {
  email: string;
  name: string;
  role: string;
}

export async function getSessionInfo(): Promise<SessionInfo | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  return {
    email,
    name: session.user?.name ?? "",
    role: (session?.user as { role?: string })?.role ?? "Terapeuta",
  };
}

export const unauthorized = () =>
  NextResponse.json({ error: "No autorizado" }, { status: 401 });

export const forbidden = () =>
  NextResponse.json({ error: "Sin permiso sobre este recurso" }, { status: 403 });

export const notFound = () =>
  NextResponse.json({ error: "No encontrado" }, { status: 404 });
