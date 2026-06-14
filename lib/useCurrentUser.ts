"use client";
import { useSession } from "next-auth/react";

export function useCurrentUser() {
  const { data: session } = useSession();
  return {
    email: session?.user?.email ?? "",
    name: session?.user?.name ?? "Usuario",
    role: (session?.user as { role?: string })?.role ?? "Terapeuta",
  };
}
