import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hoyRD } from "@/lib/format";

export type RangoClave =
  | "este_mes"
  | "mes_pasado"
  | "este_anio"
  | "todo"
  | "personalizado";

export type FiltrosNomina = {
  q: string;
  empleado: string;
  metodo: string;
  rango: RangoClave;
  desde: string; // YYYY-MM-DD inclusive
  hasta: string; // YYYY-MM-DD inclusive
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Calcula desde/hasta (inclusive) según el atajo de rango. */
function rangoFechas(rango: RangoClave, desdeIn?: string, hastaIn?: string) {
  const hoy = hoyRD();
  const [y, m] = hoy.split("-").map(Number);
  const primerDia = (yy: number, mm: number) =>
    `${yy}-${String(mm).padStart(2, "0")}-01`;
  const ultimoDia = (yy: number, mm: number) => {
    const d = new Date(Date.UTC(yy, mm, 0)); // día 0 del mes siguiente = último de este
    return ymd(d);
  };

  switch (rango) {
    case "mes_pasado": {
      const mm = m === 1 ? 12 : m - 1;
      const yy = m === 1 ? y - 1 : y;
      return { desde: primerDia(yy, mm), hasta: ultimoDia(yy, mm) };
    }
    case "este_anio":
      return { desde: `${y}-01-01`, hasta: `${y}-12-31` };
    case "todo":
      return { desde: "2000-01-01", hasta: "2999-12-31" };
    case "personalizado": {
      const re = /^\d{4}-\d{2}-\d{2}$/;
      const desde = re.test(desdeIn ?? "") ? (desdeIn as string) : primerDia(y, m);
      const hasta = re.test(hastaIn ?? "") ? (hastaIn as string) : ultimoDia(y, m);
      return { desde, hasta };
    }
    case "este_mes":
    default:
      return { desde: primerDia(y, m), hasta: ultimoDia(y, m) };
  }
}

export function parseFiltros(sp: Record<string, string | undefined>): FiltrosNomina {
  const rango = (
    ["este_mes", "mes_pasado", "este_anio", "todo", "personalizado"].includes(
      sp.rango ?? "",
    )
      ? sp.rango
      : "este_mes"
  ) as RangoClave;
  const { desde, hasta } = rangoFechas(rango, sp.desde, sp.hasta);
  return {
    q: (sp.q ?? "").trim(),
    empleado: (sp.empleado ?? "").trim(),
    metodo: (sp.metodo ?? "").trim(),
    rango,
    desde,
    hasta,
  };
}

/** Número de meses calendario en el rango (para el promedio mensual). */
export function mesesEnRango(desde: string, hasta: string): number {
  const [y1, m1] = desde.split("-").map(Number);
  const [y2, m2] = hasta.split("-").map(Number);
  return Math.max(1, (y2 - y1) * 12 + (m2 - m1) + 1);
}

export type NominaFila = {
  id: string;
  empleado_id: string;
  monto: number;
  fecha_pago: string;
  periodo: string;
  metodo: string;
  notas: string | null;
  empleados: { nombre_completo: string } | null;
};

/** Consulta los pagos según los filtros (respeta RLS solo-admin). */
export async function consultarNominas(
  supabase: SupabaseClient,
  f: FiltrosNomina,
): Promise<NominaFila[]> {
  let ids: string[] | null = null;
  if (f.q) {
    const safe = f.q.replace(/[%,()]/g, " ").trim();
    const { data } = await supabase
      .from("empleados")
      .select("id")
      .ilike("nombre_completo", `%${safe}%`);
    ids = (data ?? []).map((e) => e.id as string);
    if (ids.length === 0) return [];
  }

  let query = supabase
    .from("nominas")
    .select(
      "id, empleado_id, monto, fecha_pago, periodo, metodo, notas, empleados(nombre_completo)",
    )
    .gte("fecha_pago", f.desde)
    .lte("fecha_pago", f.hasta)
    .order("fecha_pago", { ascending: false });

  if (f.empleado) query = query.eq("empleado_id", f.empleado);
  if (f.metodo) query = query.eq("metodo", f.metodo);
  if (ids) query = query.in("empleado_id", ids);

  const { data } = await query;
  return (data ?? []) as unknown as NominaFila[];
}
