import { unauthorized } from "@/lib/apiAuth";
import { getScope } from "@/lib/center";
import { buildTemplate } from "@/lib/patientImport";

/** Planilla tipo en Excel para importar usuarios */
export async function GET() {
  const scope = await getScope();
  if (!scope) return unauthorized();
  const buffer = await buildTemplate(!!scope.centerId);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-usuarios-todo.xlsx"',
    },
  });
}
