import { z } from "zod";

import { CAMARA_ESTADOS, MANTENIMIENTO_TIPOS } from "@/lib/constants/camara";

/** "" -> undefined para campos opcionales de formularios. */
const opc = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

/** Número desde texto de formulario (>= 0). */
const costoSchema = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z
    .number({ invalid_type_error: "Costo inválido" })
    .min(0, "El costo no puede ser negativo")
    .optional(),
);

const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const mantenimientoSchema = z.object({
  fecha: fechaSchema,
  tipo: z.enum(MANTENIMIENTO_TIPOS, { errorMap: () => ({ message: "Elige el tipo" }) }),
  descripcion: z.string().trim().min(3, "Describe qué se hizo").max(2000),
  realizado_por: opc(z.string().trim().max(200)),
  costo: costoSchema,
  proximo_mantenimiento: opc(fechaSchema),
});

export const incidenciaSchema = z.object({
  fecha: fechaSchema,
  descripcion: z.string().trim().min(3, "Describe qué pasó").max(2000),
  resolucion: opc(z.string().trim().max(2000)),
});

export const estadoCamaraSchema = z.object({
  estado: z.enum(CAMARA_ESTADOS, { errorMap: () => ({ message: "Estado inválido" }) }),
  estado_nota: opc(z.string().trim().max(500)),
  proximo_mantenimiento: opc(fechaSchema),
});

export type MantenimientoInput = z.infer<typeof mantenimientoSchema>;
export type IncidenciaInput = z.infer<typeof incidenciaSchema>;
export type EstadoCamaraInput = z.infer<typeof estadoCamaraSchema>;
