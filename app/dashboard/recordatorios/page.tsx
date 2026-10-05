import { redirect } from "next/navigation";

/**
 * Tareas y recordatorios viven en una sola pantalla (N3).
 * Se mantiene la ruta para no romper enlaces guardados.
 */
export default function RecordatoriosPage() {
  redirect("/dashboard/tareas");
}
