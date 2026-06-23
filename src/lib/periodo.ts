import { hoyRD } from "@/lib/format";

export type RangoClave =
  | "este_mes"
  | "mes_pasado"
  | "este_anio"
  | "todo"
  | "personalizado";

export type Periodo = {
  rango: RangoClave;
  desde: string; // YYYY-MM-DD inclusive
  hasta: string; // YYYY-MM-DD inclusive
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function rangoFechas(
  rango: RangoClave,
  desdeIn?: string,
  hastaIn?: string,
): { desde: string; hasta: string } {
  const [y, m] = hoyRD().split("-").map(Number);
  const primer = (yy: number, mm: number) => `${yy}-${String(mm).padStart(2, "0")}-01`;
  const ultimo = (yy: number, mm: number) => ymd(new Date(Date.UTC(yy, mm, 0)));

  switch (rango) {
    case "mes_pasado": {
      const mm = m === 1 ? 12 : m - 1;
      const yy = m === 1 ? y - 1 : y;
      return { desde: primer(yy, mm), hasta: ultimo(yy, mm) };
    }
    case "este_anio":
      return { desde: `${y}-01-01`, hasta: `${y}-12-31` };
    case "todo":
      return { desde: "2000-01-01", hasta: "2999-12-31" };
    case "personalizado": {
      const re = /^\d{4}-\d{2}-\d{2}$/;
      return {
        desde: re.test(desdeIn ?? "") ? (desdeIn as string) : primer(y, m),
        hasta: re.test(hastaIn ?? "") ? (hastaIn as string) : ultimo(y, m),
      };
    }
    default:
      return { desde: primer(y, m), hasta: ultimo(y, m) };
  }
}

export function parsePeriodo(sp: Record<string, string | undefined>): Periodo {
  const rango = (
    ["este_mes", "mes_pasado", "este_anio", "todo", "personalizado"].includes(sp.rango ?? "")
      ? sp.rango
      : "este_mes"
  ) as RangoClave;
  const { desde, hasta } = rangoFechas(rango, sp.desde, sp.hasta);
  return { rango, desde, hasta };
}

export function mesesEnRango(desde: string, hasta: string): number {
  const [y1, m1] = desde.split("-").map(Number);
  const [y2, m2] = hasta.split("-").map(Number);
  return Math.max(1, (y2 - y1) * 12 + (m2 - m1) + 1);
}

/** Período inmediatamente anterior, de la misma longitud (para comparar). */
export function periodoAnterior(desde: string, hasta: string): { desde: string; hasta: string } {
  const d1 = new Date(`${desde}T00:00:00Z`);
  const d2 = new Date(`${hasta}T00:00:00Z`);
  const dias = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
  const antHasta = new Date(d1);
  antHasta.setUTCDate(antHasta.getUTCDate() - 1);
  const antDesde = new Date(antHasta);
  antDesde.setUTCDate(antDesde.getUTCDate() - (dias - 1));
  return { desde: ymd(antDesde), hasta: ymd(antHasta) };
}
