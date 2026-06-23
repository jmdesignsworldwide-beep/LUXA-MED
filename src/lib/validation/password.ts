import { z } from "zod";

/**
 * Validación del cambio de contraseña (server-side).
 * Requisitos mínimos: 8+ caracteres, con al menos una letra y un número.
 * Las dos nuevas deben coincidir y ser distintas a la actual.
 */
export const cambioPasswordSchema = z
  .object({
    actual: z.string().min(1, "Ingresa tu contraseña actual"),
    nueva: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
      .max(72, "La contraseña es demasiado larga")
      .regex(/[A-Za-z]/, "Incluye al menos una letra")
      .regex(/[0-9]/, "Incluye al menos un número"),
    confirmar: z.string().min(1, "Confirma la nueva contraseña"),
  })
  .refine((d) => d.nueva === d.confirmar, {
    path: ["confirmar"],
    message: "Las contraseñas nuevas no coinciden",
  })
  .refine((d) => d.nueva !== d.actual, {
    path: ["nueva"],
    message: "La nueva contraseña debe ser distinta a la actual",
  });

export type CambioPasswordInput = z.infer<typeof cambioPasswordSchema>;
