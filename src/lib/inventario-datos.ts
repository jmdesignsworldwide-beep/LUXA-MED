import "server-only";

/**
 * Inteligencia de inventario: cálculos sobre stock y consumo.
 * SOLO datos reales — si no hay consumo, no inventamos proyecciones.
 */

export type NivelAlerta = "critico" | "bajo" | "ok";

export type Insumo = {
  id: string;
  nombre: string;
  categoria: string | null;
  unidad: string;
  stock: number;
  nivel_minimo: number;
  costo_unitario: number;
  proveedor: string | null;
  activo: boolean;
};

export type Movimiento = {
  id: string;
  tipo: "entrada" | "salida";
  cantidad: number;
  costo_unitario: number | null;
  motivo: string | null;
  fecha: string; // YYYY-MM-DD
  created_at: string;
};

const DIA_MS = 86_400_000;

/**
 * Semáforo de stock:
 *   crítico (rojo): stock en cero o por debajo/igual al nivel mínimo.
 *   bajo (ámbar):   se está acercando al mínimo (≤ 1.5× el mínimo).
 *   ok:             holgado.
 * Si no hay nivel mínimo definido, solo el cero es crítico.
 */
export function nivelAlerta(stock: number, minimo: number): NivelAlerta {
  if (stock <= 0) return "critico";
  if (minimo <= 0) return "ok";
  if (stock <= minimo) return "critico";
  if (stock <= minimo * 1.5) return "bajo";
  return "ok";
}

export function valorInsumo(i: Pick<Insumo, "stock" | "costo_unitario">): number {
  return Number(i.stock) * Number(i.costo_unitario);
}

export type Inteligencia = {
  valor: number; // stock × costo unitario
  tasaDiaria: number; // unidades/día (consumo de los últimos 30 días)
  diasRestantes: number | null; // proyección de agotamiento (null = sin consumo)
  fechaAgotamiento: string | null; // YYYY-MM-DD estimada
  consumoMensualProm: number; // unidades/mes promedio (toda la historia)
  consumoValorMensual: number; // RD$/mes promedio consumido
  salidas30: number; // unidades consumidas en los últimos 30 días
  salidasPrev30: number; // unidades consumidas en los 30 días anteriores
  deltaPct: number | null; // variación del consumo (período vs. anterior)
  totalEntradas: number;
  totalSalidas: number;
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Calcula la inteligencia de un insumo a partir de su historial de movimientos. */
export function calcularInteligencia(
  insumo: Pick<Insumo, "stock" | "costo_unitario">,
  movimientos: Movimiento[],
  hoy: Date = new Date(),
): Inteligencia {
  const stock = Number(insumo.stock);
  const costo = Number(insumo.costo_unitario);

  const corte30 = new Date(hoy.getTime() - 30 * DIA_MS);
  const corte60 = new Date(hoy.getTime() - 60 * DIA_MS);

  let salidas30 = 0;
  let salidasPrev30 = 0;
  let totalEntradas = 0;
  let totalSalidas = 0;
  let primeraSalida: Date | null = null;

  for (const m of movimientos) {
    const cant = Number(m.cantidad);
    if (m.tipo === "entrada") {
      totalEntradas += cant;
      continue;
    }
    // salida
    totalSalidas += cant;
    const f = new Date(`${m.fecha}T00:00:00`);
    if (!primeraSalida || f < primeraSalida) primeraSalida = f;
    if (f >= corte30) salidas30 += cant;
    else if (f >= corte60) salidasPrev30 += cant;
  }

  // Ritmo actual: consumo de los últimos 30 días.
  const tasaDiaria = salidas30 / 30;
  const diasRestantes = tasaDiaria > 0 ? Math.floor(stock / tasaDiaria) : null;
  const fechaAgotamiento =
    diasRestantes != null ? ymd(new Date(hoy.getTime() + diasRestantes * DIA_MS)) : null;

  // Promedio mensual sobre toda la historia de consumo.
  let mesesHistoria = 1;
  if (primeraSalida) {
    const dias = Math.max(1, (hoy.getTime() - primeraSalida.getTime()) / DIA_MS);
    mesesHistoria = Math.max(1, dias / 30);
  }
  const consumoMensualProm = totalSalidas / mesesHistoria;
  const consumoValorMensual = consumoMensualProm * costo;

  const deltaPct =
    salidasPrev30 > 0
      ? ((salidas30 - salidasPrev30) / salidasPrev30) * 100
      : salidas30 > 0
        ? null // antes no había consumo: no hay base de comparación
        : 0;

  return {
    valor: stock * costo,
    tasaDiaria,
    diasRestantes,
    fechaAgotamiento,
    consumoMensualProm,
    consumoValorMensual,
    salidas30,
    salidasPrev30,
    deltaPct,
    totalEntradas,
    totalSalidas,
  };
}

/** Frase humana de la proyección de agotamiento. */
export function fraseProyeccion(
  nombre: string,
  unidad: string,
  intel: Pick<Inteligencia, "diasRestantes" | "tasaDiaria">,
  stock: number,
): string {
  if (stock <= 0) return "Sin existencias.";
  if (intel.diasRestantes == null) return "Sin consumo reciente: no hay proyección.";
  const d = intel.diasRestantes;
  const cuanto =
    d >= 60
      ? `~${Math.round(d / 30)} meses`
      : d >= 14
        ? `~${Math.round(d / 7)} semanas`
        : `~${d} día${d === 1 ? "" : "s"}`;
  return `Al ritmo actual, ${nombre.toLowerCase()} dura ${cuanto}.`;
}
