import { z } from "zod";

import { METODOS_PAGO } from "@/lib/constants/nominas";

const opc = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

export const nominaSchema = z.object({
  empleado_id: z.string().uuid("Selecciona un empleado"),
  monto: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z
      .number({ invalid_type_error: "Monto inválido" })
      .positive("El monto debe ser mayor que 0"),
  ),
  fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  periodo: z.string().trim().min(3, "Indica el período que cubre").max(120),
  metodo: z.enum(METODOS_PAGO, {
    errorMap: () => ({ message: "Elige el método de pago" }),
  }),
  notas: opc(z.string().trim().max(1000)),
});

export type NominaInput = z.infer<typeof nominaSchema>;
