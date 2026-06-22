/**
 * Formateadores para República Dominicana.
 * Fechas DD/MM/AAAA, moneda RD$.
 */

export function formatFecha(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatRD(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    currencyDisplay: "symbol",
  }).format(value);
}

/** Cédula 000-0000000-0 a partir de dígitos (para máscara mientras se escribe). */
export function formatCedula(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 10)}-${d.slice(10)}`;
}

/** Teléfono RD 809-555-1234 a partir de dígitos (máscara mientras se escribe). */
export function formatTelefonoRD(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Hora en RD (ej. "09:00 a. m.") a partir de un timestamp. */
export function formatHoraRD(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: "America/Santo_Domingo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/** Fecha de hoy en RD como YYYY-MM-DD. */
export function hoyRD(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santo_Domingo",
  }).format(new Date());
}
