/** Opciones del módulo de nóminas. */

export const METODOS_PAGO = ["transferencia", "efectivo", "cheque"] as const;

export const METODO_PAGO_LABEL: Record<string, string> = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  cheque: "Cheque",
};

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Período por defecto: "Mes de junio 2026" (en hora RD). */
export function periodoMesActual(): string {
  const ahora = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const [anio, mes] = ahora.split("-");
  return `Mes de ${MESES[Number(mes) - 1]} ${anio}`;
}
