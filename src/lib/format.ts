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

/** Cédula 000-0000000-0 a partir de 11 dígitos. */
export function formatCedula(digits: string): string {
  const clean = digits.replace(/\D/g, "").slice(0, 11);
  if (clean.length !== 11) return digits;
  return `${clean.slice(0, 3)}-${clean.slice(3, 10)}-${clean.slice(10)}`;
}
