import { z } from "zod";

const opc = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

const num = (msg: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number({ invalid_type_error: msg }).min(0, msg),
  );

const numPos = (msg: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number({ invalid_type_error: msg }).positive(msg),
  );

const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const categoriaInsumoSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio").max(80),
});

export const insumoSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio").max(160),
  categoria_id: opc(z.string().trim().max(80)),
  nueva_categoria: opc(z.string().trim().max(80)),
  unidad: z.string().trim().min(1).max(40),
  nivel_minimo: num("Nivel mínimo inválido"),
  costo_unitario: num("Costo inválido"),
  proveedor: opc(z.string().trim().max(160)),
  stock_inicial: opc(num("Stock inicial inválido")),
});

export const entradaSchema = z.object({
  cantidad: numPos("Cantidad inválida"),
  costo_unitario: num("Costo inválido"),
  fecha: fechaSchema,
  motivo: opc(z.string().trim().max(300)),
});

export const salidaSchema = z.object({
  cantidad: numPos("Cantidad inválida"),
  fecha: fechaSchema,
  motivo: opc(z.string().trim().max(300)),
});

export type InsumoInput = z.infer<typeof insumoSchema>;
