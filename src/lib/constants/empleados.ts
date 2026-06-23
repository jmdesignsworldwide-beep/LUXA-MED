/** Opciones del módulo de empleados. */

export const PUESTOS = [
  "medico",
  "enfermera",
  "recepcion",
  "tecnico",
  "otro",
] as const;

export const PUESTO_LABEL: Record<string, string> = {
  medico: "Médico",
  enfermera: "Enfermera",
  recepcion: "Recepción",
  tecnico: "Técnico",
  otro: "Otro",
};

export const EMPLEADOS_PAGE_SIZE = 20;
