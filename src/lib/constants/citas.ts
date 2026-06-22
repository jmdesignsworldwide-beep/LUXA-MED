/** Opciones del módulo de citas. */

/** RD usa UTC-4 fijo (sin horario de verano). */
export const RD_OFFSET = "-04:00";
export const RD_TZ = "America/Santo_Domingo";

export const DURACIONES_RAPIDAS = [
  { min: 45, label: "45 min" },
  { min: 90, label: "1 h 30" },
] as const;

export const ESTADO_CITA_LABEL: Record<string, string> = {
  programada: "Programada",
  completada: "Completada",
  cancelada: "Cancelada",
  no_asistio: "No asistió",
};

export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;
