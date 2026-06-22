import { z } from "zod";

import { cedulaSchema, fechaSchema, telefonoRdSchema } from "./common";
import { roleSchema } from "@/lib/auth/roles";

/**
 * Validación server-side para datos privados de empleados (RRHH).
 * Solo Admin accede — bloqueado por RLS para todos los demás roles.
 */
export const empleadoSchema = z.object({
  nombre_completo: z.string().trim().min(3, "El nombre es obligatorio").max(160),
  cedula: cedulaSchema.optional().nullable(),
  telefono: telefonoRdSchema.optional().nullable(),
  direccion: z.string().trim().max(300).optional().nullable(),
  salario: z
    .number()
    .nonnegative("El salario no puede ser negativo")
    .optional()
    .nullable(),
  fecha_ingreso: fechaSchema.optional().nullable(),
  notas_rrhh: z.string().trim().max(5000).optional().nullable(),
});

export type EmpleadoInput = z.infer<typeof empleadoSchema>;

/** Asignación de rol a un usuario (solo Admin). */
export const asignarRolSchema = z.object({
  user_id: z.string().uuid(),
  role: roleSchema,
});

export type AsignarRolInput = z.infer<typeof asignarRolSchema>;
