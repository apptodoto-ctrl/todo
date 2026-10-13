import { prisma } from "@/lib/db";
import { getSessionInfo } from "@/lib/apiAuth";

/**
 * Permisos que la Administradora puede encender o apagar para cada terapeuta.
 * Lo que no está aquí no se negocia: una terapeuta siempre ve y edita a sus
 * propios pacientes, y nunca ve la agenda del Centro completo.
 */
export interface CenterPermissions {
  verTodosPacientes: boolean;
  crearPacientes: boolean;
  enviarInformes: boolean;
  registrarPagos: boolean;
  descargarDatos: boolean;
  crearPlantillas: boolean;
}

export const DEFAULT_PERMISSIONS: CenterPermissions = {
  verTodosPacientes: false,
  crearPacientes: true,
  enviarInformes: false,
  registrarPagos: false,
  descargarDatos: false,
  crearPlantillas: false,
};

export const PERMISSION_LABELS: Record<keyof CenterPermissions, string> = {
  verTodosPacientes: "Ver todos los pacientes del Centro",
  crearPacientes: "Crear pacientes nuevos",
  enviarInformes: "Enviar informes a las familias",
  registrarPagos: "Registrar pagos de las familias",
  descargarDatos: "Descargar información de sus pacientes",
  crearPlantillas: "Crear sus propias plantillas",
};

export function parsePermissions(raw: unknown): CenterPermissions {
  const value = (raw ?? {}) as Record<string, unknown>;
  const out = { ...DEFAULT_PERMISSIONS };
  for (const key of Object.keys(DEFAULT_PERMISSIONS) as (keyof CenterPermissions)[]) {
    if (typeof value[key] === "boolean") out[key] = value[key] as boolean;
  }
  return out;
}

export type CenterRole = "individual" | "administradora" | "terapeuta";

export interface Scope {
  email: string;
  name: string;
  role: CenterRole;
  centerId: string | null;
  centerName: string;
  /** Correo de la Administradora: en un Centro el plan y los créditos son suyos */
  adminEmail: string;
  permissions: CenterPermissions;
  isAdmin: boolean;
  /** Cuenta del equipo TOdo: no pasa por facturación */
  platformAdmin: boolean;
}

/** La Administradora puede todo dentro de su Centro */
const ADMIN_PERMISSIONS: CenterPermissions = {
  verTodosPacientes: true,
  crearPacientes: true,
  enviarInformes: true,
  registrarPagos: true,
  descargarDatos: true,
  crearPlantillas: true,
};

/**
 * Quién es quien hace la petición y qué puede ver. Una cuenta sin Centro
 * (la gran mayoría hoy) queda como "individual" y se comporta igual que
 * siempre: ve lo suyo y nada más.
 */
export async function getScope(): Promise<Scope | null> {
  const session = await getSessionInfo();
  if (!session) return null;

  const membership = await prisma.centerMember.findFirst({
    where: { userEmail: session.email, active: true, joinedAt: { not: null } },
    include: { center: { select: { id: true, name: true, adminEmail: true } } },
  });

  if (!membership) {
    return {
      email: session.email,
      name: session.name,
      role: "individual",
      centerId: null,
      centerName: "",
      adminEmail: session.email,
      permissions: ADMIN_PERMISSIONS,
      isAdmin: false,
      platformAdmin: session.role === "admin",
    };
  }

  const isAdmin = membership.role === "administradora";
  return {
    email: session.email,
    name: session.name,
    role: isAdmin ? "administradora" : "terapeuta",
    centerId: membership.centerId,
    centerName: membership.center.name,
    adminEmail: membership.center.adminEmail,
    permissions: isAdmin ? ADMIN_PERMISSIONS : parsePermissions(membership.permissions),
    isAdmin,
    platformAdmin: session.role === "admin",
  };
}

/**
 * Filtro para los pacientes que esta persona puede ver.
 * - Individual: los suyos.
 * - Administradora: todos los del Centro.
 * - Terapeuta: los que tiene a cargo, salvo que se le permita ver todos.
 */
export function patientScope(scope: Scope) {
  if (!scope.centerId) return { createdBy: scope.email };
  if (scope.isAdmin || scope.permissions.verTodosPacientes) return { centerId: scope.centerId };
  return {
    centerId: scope.centerId,
    OR: [{ therapistEmail: scope.email }, { createdBy: scope.email }],
  };
}

/**
 * Filtro para la agenda. Una terapeuta ve solo su propia agenda, aunque
 * pueda ver los pacientes de otras: así lo pide el documento del Centro.
 */
export function agendaScope(scope: Scope) {
  if (!scope.centerId) return { createdBy: scope.email };
  if (scope.isAdmin) return { centerId: scope.centerId };
  return { centerId: scope.centerId, createdBy: scope.email };
}

/** Filtro para lo que es del Centro pero cada quien maneja lo suyo */
export function ownScope(scope: Scope) {
  if (!scope.centerId) return { createdBy: scope.email };
  if (scope.isAdmin) return { centerId: scope.centerId };
  return { centerId: scope.centerId, createdBy: scope.email };
}

/** Campos que hay que grabar al crear algo, para que quede en el Centro */
export function ownerFields(scope: Scope) {
  return { createdBy: scope.email, ...(scope.centerId ? { centerId: scope.centerId } : {}) };
}

/** Cupos del Centro: cuántos hay y cuántos se están usando */
export async function seatUsage(centerId: string) {
  const [center, used] = await Promise.all([
    prisma.center.findUnique({ where: { id: centerId }, select: { seats: true, extraSeats: true } }),
    prisma.centerMember.count({ where: { centerId, active: true, role: "terapeuta" } }),
  ]);
  const total = (center?.seats ?? 0) + (center?.extraSeats ?? 0);
  return { total, used, free: Math.max(0, total - used) };
}

/** Tope duro: un Centro no pasa de 12 terapeutas sin que TOdo lo autorice */
export const MAX_THERAPISTS = 12;

/** ¿Puede esta persona abrir la ficha de este paciente? */
export function canAccessPatient(
  scope: Scope,
  patient: { createdBy: string; centerId: string | null; therapistEmail: string }
): boolean {
  if (!scope.centerId) return patient.createdBy === scope.email && patient.centerId === null;
  if (patient.centerId !== scope.centerId) return false;
  if (scope.isAdmin || scope.permissions.verTodosPacientes) return true;
  return patient.therapistEmail === scope.email || patient.createdBy === scope.email;
}

/**
 * Carga un paciente comprobando el alcance. Devuelve el paciente, o el
 * error que corresponde servir.
 */
export async function loadPatient(scope: Scope, patientId: number) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return { patient: null, status: 404 as const };
  if (!canAccessPatient(scope, patient)) return { patient: null, status: 403 as const };
  return { patient, status: 200 as const };
}

/**
 * De quién es el plan y los créditos. En un Centro, del Centro: la bolsa
 * es común y la paga la Administradora.
 */
export function billingEmail(scope: Scope): string {
  return scope.centerId ? scope.adminEmail : scope.email;
}

/** ¿Tiene este permiso? La Administradora y las cuentas individuales, siempre */
export function can(scope: Scope, permission: keyof CenterPermissions): boolean {
  return scope.permissions[permission] === true;
}
