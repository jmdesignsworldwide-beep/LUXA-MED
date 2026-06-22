import { z } from "zod";

const str = z.preprocess(
  (v) => (v === "" || v == null ? undefined : String(v).trim()),
  z.string().optional(),
);
const num = z.preprocess(
  (v) => (v === "" || v == null ? undefined : Number(v)),
  z.number().optional(),
);
const int = z.preprocess(
  (v) => (v === "" || v == null ? undefined : parseInt(String(v), 10)),
  z.number().int().optional(),
);
const spo2 = z.preprocess(
  (v) => (v === "" || v == null ? undefined : parseInt(String(v), 10)),
  z.number().int().min(0).max(100).optional(),
);
const citaId = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.string().uuid().optional(),
);

/**
 * Validación server-side de una sesión de terapia hiperbárica.
 * (Datos clínicos de terapia — los registra admin o enfermera, no recepción.)
 */
export const sesionSchema = z.object({
  cita_id: citaId,
  numero_sesion: int,
  total_sesiones: int,
  spo2_antes: spo2,
  ta_antes: str,
  fc_antes: int,
  presion_ata: num,
  duracion_min: int,
  spo2_despues: spo2,
  evolucion: str,
  incidencias: str,
});

export type SesionInput = z.infer<typeof sesionSchema>;
