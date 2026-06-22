/** Opciones de dominio para pacientes (RD). */

export const ARS_OPCIONES = [
  "SeNaSa",
  "ARS Humano",
  "ARS Universal",
  "Mapfre Salud",
  "ARS Palic",
  "ARS APS",
  "ARS Reservas",
  "ARS Simag",
  "Otra",
  "Sin seguro / Privado",
] as const;

export const TIPOS_SANGRE = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

export const SEXO_OPCIONES = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
  { value: "Otro", label: "Otro" },
] as const;

export const PACIENTES_PAGE_SIZE = 10;
