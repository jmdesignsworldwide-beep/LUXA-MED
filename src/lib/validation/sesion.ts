import { z } from "zod";

import { uuidSchema } from "./common";

/**
 * Validación server-side para datos de sesión de terapia hiperbárica.
 * La pueden registrar médico, enfermera y admin (NO recepción) — garantizado
 * por RLS. Aquí solo validamos forma y rangos clínicos.
 */
export const sesionSchema = z.object({
  paciente_id: uuidSchema,
  presion_ata: z
    .number()
    .positive("La presión (ATA) debe ser mayor que 0")
    .max(10, "Presión (ATA) fuera de rango")
    .optional()
    .nullable(),
  duracion_min: z
    .number()
    .int()
    .positive("La duración debe ser mayor que 0")
    .optional()
    .nullable(),
  spo2_antes: z
    .number()
    .int()
    .min(0)
    .max(100, "SpO2 debe estar entre 0 y 100")
    .optional()
    .nullable(),
  spo2_despues: z
    .number()
    .int()
    .min(0)
    .max(100, "SpO2 debe estar entre 0 y 100")
    .optional()
    .nullable(),
  evolucion: z.string().trim().max(5000).optional().nullable(),
});

export type SesionInput = z.infer<typeof sesionSchema>;
