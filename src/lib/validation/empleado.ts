import { z } from "zod";

import { cedulaSchema, fechaSchema, telefonoRdSchema } from "./common";
import { roleSchema } from "@/lib/auth/roles";

const opc = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

const salarioSchema = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z
    .number({ invalid_type_error: "Salario inválido" })
    .min(0, "El salario no puede ser negativo")
    .optional(),
);

/**
 * Validación del empleado. Campos públicos + privados en un solo formulario.
 * Solo el admin envía los privados; la BD lo garantiza con RLS (tabla aparte).
 */
export const empleadoSchema = z.object({
  // Públicos
  nombre_completo: z.string().trim().min(3, "El nombre es obligatorio").max(160),
  puesto: z.enum(["medico", "enfermera", "recepcion", "tecnico", "otro"], {
    errorMap: () => ({ message: "Elige el puesto" }),
  }),
  telefono: opc(telefonoRdSchema),
  email: opc(z.string().trim().email("Correo inválido")),
  fecha_ingreso: opc(fechaSchema),
  user_id: opc(z.string().uuid("Cuenta inválida")),

  // Privados (solo admin)
  cedula: opc(cedulaSchema),
  salario: salarioSchema,
  banco: opc(z.string().trim().max(120)),
  cuenta_banco: opc(z.string().trim().max(60)),
  direccion: opc(z.string().trim().max(300)),
  contacto_emergencia_nombre: opc(z.string().trim().max(160)),
  contacto_emergencia_telefono: opc(telefonoRdSchema),
  notas_rrhh: opc(z.string().trim().max(2000)),
});

export type EmpleadoInput = z.infer<typeof empleadoSchema>;

/** Cuenta de acceso del empleado (la crea el admin). */
export const cuentaEmpleadoSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .max(72, "Demasiado larga")
    .regex(/[A-Z]/, "Incluye al menos una mayúscula")
    .regex(/[0-9]/, "Incluye al menos un número"),
  rol: z.enum(["admin", "enfermera", "recepcion"], {
    errorMap: () => ({ message: "Elige el rol de acceso" }),
  }),
});

export type CuentaEmpleadoInput = z.infer<typeof cuentaEmpleadoSchema>;

/** Asignación de rol a un usuario (solo Admin). */
export const asignarRolSchema = z.object({
  user_id: z.string().uuid(),
  role: roleSchema,
});

export type AsignarRolInput = z.infer<typeof asignarRolSchema>;
