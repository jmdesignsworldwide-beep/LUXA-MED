/** Opciones del módulo de la cámara hiperbárica (una sola cámara). */

/** Fila única de la cámara (se siembra en la migración 0022). */
export const CAMARA_ID = "00000000-0000-0000-0000-0000000000c1";

export const CAMARA_ESTADOS = [
  "operativa",
  "en_mantenimiento",
  "fuera_de_servicio",
] as const;

export const CAMARA_ESTADO_LABEL: Record<string, string> = {
  operativa: "Operativa",
  en_mantenimiento: "En mantenimiento",
  fuera_de_servicio: "Fuera de servicio",
};

export const MANTENIMIENTO_TIPOS = ["preventivo", "correctivo"] as const;

export const MANTENIMIENTO_TIPO_LABEL: Record<string, string> = {
  preventivo: "Preventivo",
  correctivo: "Correctivo",
};
