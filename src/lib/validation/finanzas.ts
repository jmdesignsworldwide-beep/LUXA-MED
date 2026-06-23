import { z } from "zod";

const opc = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

const montoSchema = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number({ invalid_type_error: "Monto inválido" }).positive("El monto debe ser mayor que 0"),
);

const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const gastoSchema = z.object({
  monto: montoSchema,
  fecha: fechaSchema,
  // "nueva" indica crear categoría al vuelo con nueva_categoria.
  categoria_id: z.string().min(1, "Elige una categoría"),
  nueva_categoria: opc(z.string().trim().min(2, "Nombre muy corto").max(80)),
  nota: opc(z.string().trim().max(1000)),
});

export const ingresoSchema = z.object({
  monto: montoSchema,
  fecha: fechaSchema,
  concepto: z.string().trim().min(3, "Indica el concepto").max(200),
  nota: opc(z.string().trim().max(1000)),
});

export const categoriaSchema = z.object({
  nombre: z.string().trim().min(2, "Nombre muy corto").max(80),
});

export type GastoInput = z.infer<typeof gastoSchema>;
export type IngresoInput = z.infer<typeof ingresoSchema>;
