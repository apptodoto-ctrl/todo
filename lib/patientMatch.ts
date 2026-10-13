import { prisma } from "@/lib/db";

/** Compara nombres ignorando mayúsculas, tildes y espacios de más */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca el paciente de esa cuenta cuyo nombre corresponde al texto escrito.
 * Solo devuelve un paciente cuando no hay dudas: una única coincidencia
 * exacta, o una única coincidencia por nombre incompleto ("Vera" →
 * "Vera Martínez"). Sirve para que una cita escrita a mano quede igual
 * ligada a la ficha, que es lo que alimenta "Próxima sesión".
 */
export async function findPatientByName(createdBy: string, title: string): Promise<number | null> {
  const target = normalizeName(title || "");
  if (target.length < 3) return null;

  const patients = await prisma.patient.findMany({
    where: { createdBy },
    select: { id: true, name: true },
  });
  if (patients.length === 0) return null;

  const exact = patients.filter((p) => normalizeName(p.name) === target);
  if (exact.length === 1) return exact[0].id;
  if (exact.length > 1) return null; // dos pacientes con el mismo nombre: mejor no adivinar

  const partial = patients.filter((p) => {
    const name = normalizeName(p.name);
    return name.startsWith(target) || target.startsWith(name);
  });
  return partial.length === 1 ? partial[0].id : null;
}
