import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type GastoFila = {
  id: string;
  fecha: string;
  categoria: string;
  concepto: string;
  monto: number;
  editable: boolean; // las de nómina no se editan aquí
};
export type IngresoFila = {
  id: string;
  fecha: string;
  concepto: string;
  nota: string | null;
  monto: number;
};

export type ResumenFinanciero = {
  gastos: GastoFila[];
  ingresos: IngresoFila[];
  entro: number;
  salio: number;
  margen: number;
  margenPct: number;
  porCategoria: { categoria: string; monto: number }[];
  mayorGasto: { categoria: string; monto: number } | null;
};

/**
 * Resumen financiero de un período. Refleja la NÓMINA como gasto de categoría
 * "Nóminas" (sin duplicar: la nómina sigue siendo su propia fuente).
 * categoriaIds vacío = todas. incluirNomina decide si se suma la nómina.
 */
export async function resumenFinanciero(
  supabase: SupabaseClient,
  desde: string,
  hasta: string,
  categoriaIds: string[] = [],
  incluirNomina = true,
): Promise<ResumenFinanciero> {
  // Gastos manuales
  let gq = supabase
    .from("gastos")
    .select("id, monto, fecha, nota, categorias_gasto(nombre)")
    .gte("fecha", desde)
    .lte("fecha", hasta);
  if (categoriaIds.length > 0) gq = gq.in("categoria_id", categoriaIds);
  const { data: gm } = await gq;
  const gastosManual: GastoFila[] = ((gm ?? []) as Record<string, unknown>[]).map((g) => {
    const cat = g.categorias_gasto as { nombre: string } | { nombre: string }[] | null;
    const nombre = Array.isArray(cat) ? cat[0]?.nombre : cat?.nombre;
    return {
      id: g.id as string,
      fecha: g.fecha as string,
      categoria: nombre ?? "Sin categoría",
      concepto: (g.nota as string) ?? "",
      monto: Number(g.monto),
      editable: true,
    };
  });

  // Nómina reflejada (si corresponde a la selección)
  let nominaFilas: GastoFila[] = [];
  if (incluirNomina) {
    const { data: nm } = await supabase
      .from("nominas")
      .select("id, monto, fecha_pago, empleados(nombre_completo)")
      .gte("fecha_pago", desde)
      .lte("fecha_pago", hasta);
    nominaFilas = ((nm ?? []) as Record<string, unknown>[]).map((n) => {
      const emp = n.empleados as { nombre_completo: string } | { nombre_completo: string }[] | null;
      const nombre = Array.isArray(emp) ? emp[0]?.nombre_completo : emp?.nombre_completo;
      return {
        id: n.id as string,
        fecha: n.fecha_pago as string,
        categoria: "Nóminas",
        concepto: `Pago a ${nombre ?? "empleado"}`,
        monto: Number(n.monto),
        editable: false,
      };
    });
  }

  const gastos = [...gastosManual, ...nominaFilas].sort((a, b) =>
    a.fecha < b.fecha ? 1 : -1,
  );

  const { data: ing } = await supabase
    .from("ingresos")
    .select("id, monto, fecha, concepto, nota")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: false });
  const ingresos: IngresoFila[] = (ing ?? []).map((i) => ({
    id: i.id as string,
    fecha: i.fecha as string,
    concepto: i.concepto as string,
    nota: (i.nota as string) ?? null,
    monto: Number(i.monto),
  }));

  const salio = gastos.reduce((a, g) => a + g.monto, 0);
  const entro = ingresos.reduce((a, i) => a + i.monto, 0);
  const margen = entro - salio;
  const margenPct = entro > 0 ? (margen / entro) * 100 : 0;

  const mapa = new Map<string, number>();
  for (const g of gastos) mapa.set(g.categoria, (mapa.get(g.categoria) ?? 0) + g.monto);
  const porCategoria = Array.from(mapa.entries())
    .map(([categoria, monto]) => ({ categoria, monto }))
    .sort((a, b) => b.monto - a.monto);
  const mayorGasto = porCategoria.length > 0 ? porCategoria[0] : null;

  return { gastos, ingresos, entro, salio, margen, margenPct, porCategoria, mayorGasto };
}
