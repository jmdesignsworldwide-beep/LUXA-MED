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
const esCandidato = z.preprocess(
  (v) => (v === "si" ? true : v === "no" ? false : undefined),
  z.boolean().optional(),
);
const otoscopia = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.enum(["normal", "alterada"]).optional(),
);

/** Campos escalares del formulario (los grupos de checkboxes van aparte). */
export const evaluacionSchema = z.object({
  medico_referente: str,
  especialidad_referente: str,
  motivo_consulta: str,
  diagnostico_principal: str,
  diagnosticos_asociados: str,
  tiempo_evolucion: str,
  tratamientos_previos: str,
  medicamentos_actuales: str,
  alergias: str,
  objetivo_terapeutico: str,
  otoscopia_derecha: otoscopia,
  otoscopia_izquierda: otoscopia,
  otorrino_observaciones: str,
  capacidad_compensacion: str,
  ta: str,
  fc: int,
  fr: int,
  temperatura: num,
  sato2: int.pipe(z.number().int().min(0).max(100).optional()),
  peso: num,
  talla: num,
  imc: num,
  estado_general: str,
  sistema_cardiovascular: str,
  sistema_respiratorio: str,
  sistema_neurologico: str,
  extremidades: str,
  es_candidato: esCandidato,
  justificacion: str,
  sesiones_estimadas: int,
  presion_ata: num,
  duracion_sesion_min: int,
  plan_tratamiento: str,
  consentimiento_nombre: str,
  firma_medico: str,
  fecha_firma: str,
});

export type EvaluacionInput = z.infer<typeof evaluacionSchema>;
