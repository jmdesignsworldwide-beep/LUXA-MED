import { z } from "zod";

import { uuidSchema } from "./common";

export const citaSchema = z.object({
  paciente_id: uuidSchema,
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  duracion_min: z.coerce
    .number()
    .int()
    .min(15, "Mínimo 15 minutos")
    .max(480, "Máximo 8 horas"),
});

export type CitaInput = z.infer<typeof citaSchema>;
