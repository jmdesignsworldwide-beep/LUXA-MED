import { z } from "zod";

import {
  cedulaSchema,
  fechaSchema,
  sexoSchema,
  telefonoRdSchema,
} from "./common";

/**
 * Validación server-side para datos demográficos de paciente.
 * (Recepción SÍ trabaja con estos datos; lo clínico va aparte.)
 */
export const pacienteSchema = z.object({
  nombre_completo: z
    .string()
    .trim()
    .min(3, "El nombre es obligatorio")
    .max(160),
  cedula: cedulaSchema.optional().nullable(),
  fecha_nacimiento: fechaSchema.optional().nullable(),
  sexo: sexoSchema.optional().nullable(),
  telefono: telefonoRdSchema.optional().nullable(),
  email: z.string().trim().email("Correo inválido").optional().nullable(),
  direccion: z.string().trim().max(300).optional().nullable(),
  contacto_emergencia: z.string().trim().max(200).optional().nullable(),
});

export type PacienteInput = z.infer<typeof pacienteSchema>;
