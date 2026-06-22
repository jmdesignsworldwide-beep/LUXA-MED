import { z } from "zod";

/**
 * Los 4 roles fijos del sistema. Un usuario = un rol.
 * El nombre técnico (izquierda) coincide con el enum `public.user_role` en la
 * base de datos. La etiqueta es para mostrar en español dominicano.
 *
 * La autorización REAL vive en RLS (base de datos). Estas constantes son solo
 * para etiquetas y conveniencia en la UI — nunca para "esconder" datos.
 */
export const ROLES = {
  admin: "Administrador",
  medico: "Médico",
  enfermera: "Enfermera",
  recepcion: "Recepción",
} as const;

export type Role = keyof typeof ROLES;

export const ROLE_VALUES = Object.keys(ROLES) as [Role, ...Role[]];

export const roleSchema = z.enum(ROLE_VALUES);

/** Personal clínico: ve diagnósticos, historia clínica y sesiones. */
export const CLINICAL_ROLES: Role[] = ["admin", "medico", "enfermera"];

/** Quién ESCRIBE diagnósticos / historia clínica: solo médico y admin. */
export const DIAGNOSIS_WRITER_ROLES: Role[] = ["admin", "medico"];

/** Recepción NUNCA está aquí: no ve diagnósticos ni historia clínica. */
export function isClinicalRole(role: Role): boolean {
  return CLINICAL_ROLES.includes(role);
}

/**
 * ¿Puede escribir diagnósticos? Solo médico y admin (la enfermera NO).
 * Esto es solo para la UI; la garantía real está en RLS.
 */
export function canWriteDiagnosis(role: Role): boolean {
  return DIAGNOSIS_WRITER_ROLES.includes(role);
}
