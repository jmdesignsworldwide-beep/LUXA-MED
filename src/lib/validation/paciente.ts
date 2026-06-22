import { z } from "zod";

import { ARS_OPCIONES, TIPOS_SANGRE } from "@/lib/constants/pacientes";
import {
  cedulaSchema,
  fechaSchema,
  sexoSchema,
  telefonoRdSchema,
} from "./common";

/** Convierte "" en undefined (para campos opcionales de formularios). */
const opcional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

/**
 * Validación server-side del expediente demográfico del paciente.
 * (Recepción SÍ trabaja con estos datos; lo clínico va aparte, en otra tabla.)
 */
export const pacienteSchema = z.object({
  nombre_completo: z.string().trim().min(3, "El nombre es obligatorio").max(160),
  cedula: cedulaSchema, // requerida y única (validada también en la base)
  fecha_nacimiento: opcional(fechaSchema),
  sexo: opcional(sexoSchema),

  telefono: opcional(telefonoRdSchema),
  email: opcional(z.string().trim().email("Correo inválido")),
  direccion: opcional(z.string().trim().max(300)),

  tipo_sangre: opcional(z.enum(TIPOS_SANGRE)),
  alergias: opcional(z.string().trim().max(1000)),
  contacto_emergencia_nombre: opcional(z.string().trim().max(160)),
  contacto_emergencia_telefono: opcional(telefonoRdSchema),

  ars: opcional(z.enum(ARS_OPCIONES)),
  ars_numero_afiliado: opcional(z.string().trim().max(60)),
});

export type PacienteInput = z.infer<typeof pacienteSchema>;
