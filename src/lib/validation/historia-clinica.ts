import { z } from "zod";

import { uuidSchema } from "./common";

/**
 * Validación server-side para historia clínica / diagnósticos.
 * Estos datos NUNCA son accesibles para Recepción — bloqueado por RLS.
 */
export const historiaClinicaSchema = z.object({
  paciente_id: uuidSchema,
  diagnostico: z.string().trim().min(1, "El diagnóstico es obligatorio").max(2000),
  notas_clinicas: z.string().trim().max(5000).optional().nullable(),
  tratamiento: z.string().trim().max(5000).optional().nullable(),
});

export type HistoriaClinicaInput = z.infer<typeof historiaClinicaSchema>;
