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

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export type SerieMensual = {
  etiquetas: string[];
  porCategoria: Record<string, number[]>;
};

/**
 * Serie mensual (gasto por categoría) de los últimos `n` meses hasta `hasta`.
 * Incluye la nómina como categoría "Nóminas". Para el mini-gráfico del desglose.
 */
export async function serieMensualCategorias(
  supabase: SupabaseClient,
  hasta: string,
  n = 6,
): Promise<SerieMensual> {
  const [hy, hm] = hasta.split("-").map(Number);
  const meses: { key: string; label: string; anio: number; mes: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    let mm = hm - i;
    let yy = hy;
    while (mm <= 0) {
      mm += 12;
      yy -= 1;
    }
    meses.push({ key: `${yy}-${String(mm).padStart(2, "0")}`, label: MESES_CORTOS[mm - 1], anio: yy, mes: mm });
  }
  const desde = `${meses[0].key}-01`;
  const ult = meses[meses.length - 1];
  const hastaFin = new Date(Date.UTC(ult.anio, ult.mes, 0)).toISOString().slice(0, 10);
  const idx = new Map(meses.map((m, i) => [m.key, i]));

  const [{ data: gm }, { data: nm }] = await Promise.all([
    supabase.from("gastos").select("monto, fecha, categorias_gasto(nombre)").gte("fecha", desde).lte("fecha", hastaFin),
    supabase.from("nominas").select("monto, fecha_pago").gte("fecha_pago", desde).lte("fecha_pago", hastaFin),
  ]);

  const porCategoria: Record<string, number[]> = {};
  const sumar = (cat: string, key: string, monto: number) => {
    const i = idx.get(key);
    if (i == null) return;
    if (!porCategoria[cat]) porCategoria[cat] = Array(n).fill(0);
    porCategoria[cat][i] += monto;
  };
  for (const g of (gm ?? []) as Record<string, unknown>[]) {
    const cat = g.categorias_gasto as { nombre: string } | { nombre: string }[] | null;
    const nombre = (Array.isArray(cat) ? cat[0]?.nombre : cat?.nombre) ?? "Sin categoría";
    sumar(nombre, (g.fecha as string).slice(0, 7), Number(g.monto));
  }
  for (const x of (nm ?? []) as Record<string, unknown>[]) {
    sumar("Nóminas", (x.fecha_pago as string).slice(0, 7), Number(x.monto));
  }

  return { etiquetas: meses.map((m) => m.label), porCategoria };
}
