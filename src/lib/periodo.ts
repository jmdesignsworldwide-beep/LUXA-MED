import { hoyRD } from "@/lib/format";

export type Periodo = {
  desde: string; // YYYY-MM-DD inclusive
  hasta: string; // YYYY-MM-DD inclusive
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Período por rango de fechas (única forma). Por defecto, el mes en curso (RD).
 */
export function parsePeriodo(sp: Record<string, string | string[] | undefined>): Periodo {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const [y, m] = hoyRD().split("-").map(Number);
  const primer = `${y}-${String(m).padStart(2, "0")}-01`;
  const ultimo = ymd(new Date(Date.UTC(y, m, 0)));
  const get = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const d = get(sp.desde);
  const h = get(sp.hasta);
  return {
    desde: re.test(d) ? d : primer,
    hasta: re.test(h) ? h : ultimo,
  };
}

export function mesesEnRango(desde: string, hasta: string): number {
  const [y1, m1] = desde.split("-").map(Number);
  const [y2, m2] = hasta.split("-").map(Number);
  return Math.max(1, (y2 - y1) * 12 + (m2 - m1) + 1);
}

/** Período inmediatamente anterior, de la misma longitud (para comparar). */
export function periodoAnterior(desde: string, hasta: string): Periodo {
  const d1 = new Date(`${desde}T00:00:00Z`);
  const d2 = new Date(`${hasta}T00:00:00Z`);
  const dias = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
  const antHasta = new Date(d1);
  antHasta.setUTCDate(antHasta.getUTCDate() - 1);
  const antDesde = new Date(antHasta);
  antDesde.setUTCDate(antDesde.getUTCDate() - (dias - 1));
  return { desde: ymd(antDesde), hasta: ymd(antHasta) };
}
