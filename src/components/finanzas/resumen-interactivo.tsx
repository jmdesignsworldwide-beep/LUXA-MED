"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Minus,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatFecha, formatRD } from "@/lib/format";

type GastoFila = { id: string; fecha: string; categoria: string; concepto: string; monto: number };
type IngresoFila = { id: string; fecha: string; concepto: string; monto: number };
type Cat = { categoria: string; monto: number };
type Anterior = { entro: number; salio: number; margen: number; porCategoria: Record<string, number> };
type Serie = { etiquetas: string[]; porCategoria: Record<string, number[]> };

type Detalle =
  | { tipo: "entro" }
  | { tipo: "salio" }
  | { tipo: "margen" }
  | { tipo: "categoria"; categoria: string }
  | null;

/** Comparación con el período anterior (flecha + RD$ + %). */
function Delta({ actual, anterior, buenoSiBaja = false }: { actual: number; anterior: number; buenoSiBaja?: boolean }) {
  const diff = actual - anterior;
  const pct = anterior !== 0 ? (diff / anterior) * 100 : null;
  if (anterior === 0 && actual === 0) return <span className="text-xs text-muted-foreground">Sin datos del período anterior</span>;
  const sube = diff > 0;
  const bueno = buenoSiBaja ? !sube : sube;
  const color = diff === 0 ? "text-muted-foreground" : bueno ? "text-emerald-600 dark:text-emerald-400" : "text-destructive";
  const Icon = sube ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {sube ? "subió" : diff < 0 ? "bajó" : "igual"} {formatRD(Math.abs(diff))}
      {pct !== null && <> ({Math.abs(Math.round(pct))}%)</>} vs. período anterior
    </span>
  );
}

function MiniChart({ etiquetas, valores }: { etiquetas: string[]; valores: number[] }) {
  const max = Math.max(1, ...valores);
  return (
    <div className="flex h-28 items-end justify-between gap-2">
      {valores.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-brand-cyan/70 transition-all"
              style={{ height: `${v > 0 ? Math.max(6, (v / max) * 100) : 2}%` }}
              title={formatRD(v)}
            />
          </div>
          <span className="text-[10px] uppercase text-muted-foreground">{etiquetas[i]}</span>
        </div>
      ))}
    </div>
  );
}

export function FinanzasResumen({
  entro,
  salio,
  margen,
  margenPct,
  meses,
  gastos,
  ingresos,
  porCategoria,
  mayorGasto,
  anterior,
  serie,
}: {
  entro: number;
  salio: number;
  margen: number;
  margenPct: number;
  meses: number;
  gastos: GastoFila[];
  ingresos: IngresoFila[];
  porCategoria: Cat[];
  mayorGasto: Cat | null;
  anterior: Anterior;
  serie: Serie;
}) {
  const [detalle, setDetalle] = React.useState<Detalle>(null);
  const toggle = (d: Detalle) =>
    setDetalle((prev) => (prev && JSON.stringify(prev) === JSON.stringify(d) ? null : d));
  const activa = (cond: boolean) => (cond ? "ring-2 ring-primary/60" : "");

  return (
    <div className="mt-6">
      {/* Tarjetas */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <button type="button" onClick={() => toggle({ tipo: "entro" })} className="text-left">
          <Card className={`h-full cursor-pointer p-6 ${activa(detalle?.tipo === "entro")}`}>
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-pill bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><ArrowUpRight className="h-5 w-5" /></div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">Entró</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatRD(entro)}</p>
          </Card>
        </button>

        <button type="button" onClick={() => toggle({ tipo: "salio" })} className="text-left">
          <Card className={`h-full cursor-pointer p-6 ${activa(detalle?.tipo === "salio")}`}>
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-pill bg-destructive/15 text-destructive"><ArrowDownRight className="h-5 w-5" /></div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">Salió</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatRD(salio)}</p>
          </Card>
        </button>

        <button type="button" onClick={() => toggle({ tipo: "margen" })} className="text-left">
          <Card className={`h-full cursor-pointer p-6 ${activa(detalle?.tipo === "margen")}`}>
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-pill bg-accent text-primary"><Minus className="h-5 w-5" /></div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">Margen</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${margen >= 0 ? "" : "text-destructive"}`}>{formatRD(margen)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{Math.round(margenPct)}%</p>
          </Card>
        </button>

        <button type="button" onClick={() => mayorGasto && toggle({ tipo: "categoria", categoria: mayorGasto.categoria })} className="text-left" disabled={!mayorGasto}>
          <Card className={`h-full p-6 ${mayorGasto ? "cursor-pointer" : ""} ${activa(detalle?.tipo === "categoria" && detalle.categoria === mayorGasto?.categoria)}`}>
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">Mayor gasto</p>
              {mayorGasto && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
            <p className="mt-3 text-lg font-semibold">{mayorGasto?.categoria ?? "—"}</p>
            <p className="mt-1 text-sm tabular-nums text-muted-foreground">{mayorGasto ? formatRD(mayorGasto.monto) : ""}</p>
          </Card>
        </button>
      </div>

      {/* Panel de detalle */}
      <AnimatePresence initial={false}>
        {detalle && (
          <motion.div
            key={JSON.stringify(detalle)}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <Card className="mt-4 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {detalle.tipo === "entro" && "Detalle de ingresos"}
                  {detalle.tipo === "salio" && "Detalle de gastos"}
                  {detalle.tipo === "margen" && "Cómo se compone el margen"}
                  {detalle.tipo === "categoria" && `Categoría — ${detalle.categoria}`}
                </h3>
                <button type="button" onClick={() => setDetalle(null)} className="flex h-8 w-8 items-center justify-center rounded-pill text-muted-foreground hover:bg-accent" aria-label="Cerrar">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {detalle.tipo === "entro" && (
                <>
                  <div className="mb-3"><Delta actual={entro} anterior={anterior.entro} /></div>
                  <Movimientos filas={ingresos.map((i) => ({ fecha: i.fecha, concepto: i.concepto, monto: i.monto, id: i.id }))} total={entro} totalLabel="Total que entró" totalColor="text-emerald-600 dark:text-emerald-400" />
                </>
              )}

              {detalle.tipo === "salio" && (
                <>
                  <div className="mb-3"><Delta actual={salio} anterior={anterior.salio} buenoSiBaja /></div>
                  <DetalleGastos gastos={gastos} porCategoria={porCategoria} total={salio} onCat={(c) => setDetalle({ tipo: "categoria", categoria: c })} />
                </>
              )}

              {detalle.tipo === "margen" && (
                <DetalleMargen entro={entro} salio={salio} margen={margen} margenPct={margenPct} meses={meses} anterior={anterior} />
              )}

              {detalle.tipo === "categoria" && (
                <DetalleCategoria
                  categoria={detalle.categoria}
                  gastos={gastos.filter((g) => g.categoria === detalle.categoria)}
                  salioTotal={salio}
                  anteriorMonto={anterior.porCategoria[detalle.categoria] ?? 0}
                  serieValores={serie.porCategoria[detalle.categoria] ?? serie.etiquetas.map(() => 0)}
                  serieEtiquetas={serie.etiquetas}
                />
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gasto por categoría (clic = desglose) */}
      {porCategoria.length > 0 && (
        <Card className="mt-6 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Gasto por categoría</h2>
          <ul className="mt-4 space-y-1">
            {porCategoria.map((c) => (
              <li key={c.categoria}>
                <button
                  type="button"
                  onClick={() => toggle({ tipo: "categoria", categoria: c.categoria })}
                  className={`flex w-full items-center justify-between gap-4 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent ${detalle?.tipo === "categoria" && detalle.categoria === c.categoria ? "bg-accent" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    {c.categoria}
                    {salio > 0 && <span className="text-xs text-muted-foreground">· {Math.round((c.monto / salio) * 100)}%</span>}
                  </span>
                  <span className="font-semibold tabular-nums">{formatRD(c.monto)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Movimientos({
  filas,
  total,
  totalLabel,
  totalColor = "",
}: {
  filas: { id: string; fecha: string; concepto: string; monto: number }[];
  total: number;
  totalLabel: string;
  totalColor?: string;
}) {
  if (filas.length === 0) return <p className="text-sm text-muted-foreground">Sin movimientos en el período.</p>;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {filas.map((f) => (
              <tr key={`${f.id}-${f.fecha}`} className="border-b border-border/40 last:border-0">
                <td className="py-2 pr-3 whitespace-nowrap tabular-nums text-muted-foreground">{formatFecha(f.fecha)}</td>
                <td className="py-2 pr-3">{f.concepto || "—"}</td>
                <td className="py-2 text-right font-semibold tabular-nums">{formatRD(f.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex justify-between border-t border-border/60 pt-3 text-sm font-semibold">
        <span>{totalLabel}</span>
        <span className={`tabular-nums ${totalColor}`}>{formatRD(total)}</span>
      </div>
    </>
  );
}

function DetalleGastos({
  gastos,
  porCategoria,
  total,
  onCat,
}: {
  gastos: GastoFila[];
  porCategoria: Cat[];
  total: number;
  onCat: (c: string) => void;
}) {
  if (gastos.length === 0) return <p className="text-sm text-muted-foreground">Sin gastos en el período.</p>;
  return (
    <div className="space-y-3">
      {porCategoria.map((c) => (
        <button
          key={c.categoria}
          type="button"
          onClick={() => onCat(c.categoria)}
          className="flex w-full items-center justify-between gap-4 rounded-lg px-2 py-2 text-sm hover:bg-accent"
        >
          <span className="flex items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            {c.categoria}
            {total > 0 && <span className="text-xs text-muted-foreground">· {Math.round((c.monto / total) * 100)}%</span>}
          </span>
          <span className="font-semibold tabular-nums">{formatRD(c.monto)}</span>
        </button>
      ))}
      <div className="flex justify-between border-t border-border/60 pt-3 text-sm font-semibold">
        <span>Total que salió</span>
        <span className="tabular-nums text-destructive">{formatRD(total)}</span>
      </div>
    </div>
  );
}

function DetalleMargen({
  entro,
  salio,
  margen,
  margenPct,
  meses,
  anterior,
}: {
  entro: number;
  salio: number;
  margen: number;
  margenPct: number;
  meses: number;
  anterior: Anterior;
}) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between"><span className="text-muted-foreground">Entró</span><span className="tabular-nums text-emerald-600 dark:text-emerald-400">{formatRD(entro)}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">− Salió</span><span className="tabular-nums text-destructive">{formatRD(salio)}</span></div>
      <div className="flex justify-between border-t border-border/60 pt-2 text-base font-semibold">
        <span>= Margen</span>
        <span className={`tabular-nums ${margen >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>{formatRD(margen)}</span>
      </div>
      <div className="pt-1"><Delta actual={margen} anterior={anterior.margen} /></div>
      <p className="pt-2 text-muted-foreground">
        Margen de <strong>{Math.round(margenPct)}%</strong> sobre lo que entró
        {meses > 1 && <> · promedio mensual: <strong>{formatRD(margen / meses)}</strong></>}.
      </p>
    </div>
  );
}

function DetalleCategoria({
  categoria,
  gastos,
  salioTotal,
  anteriorMonto,
  serieValores,
  serieEtiquetas,
}: {
  categoria: string;
  gastos: GastoFila[];
  salioTotal: number;
  anteriorMonto: number;
  serieValores: number[];
  serieEtiquetas: string[];
}) {
  const total = gastos.reduce((a, g) => a + g.monto, 0);
  const pct = salioTotal > 0 ? Math.round((total / salioTotal) * 100) : 0;

  // Agrupar por concepto (sub-tipo) dentro de la categoría.
  const mapa = new Map<string, number>();
  for (const g of gastos) {
    const k = g.concepto?.trim() || "(sin concepto)";
    mapa.set(k, (mapa.get(k) ?? 0) + g.monto);
  }
  const porConcepto = Array.from(mapa.entries()).map(([concepto, monto]) => ({ concepto, monto })).sort((a, b) => b.monto - a.monto);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <p className="text-2xl font-semibold tabular-nums">{formatRD(total)}</p>
          <p className="text-xs text-muted-foreground">{pct}% de tus gastos del período</p>
        </div>
        <Delta actual={total} anterior={anteriorMonto} buenoSiBaja />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Cómo se ha movido (últimos meses)</p>
        <MiniChart etiquetas={serieEtiquetas} valores={serieValores} />
      </div>

      {porConcepto.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Por concepto</p>
          <ul className="space-y-1 text-sm">
            {porConcepto.map((c) => (
              <li key={c.concepto} className="flex justify-between gap-4">
                <span>{c.concepto}</span>
                <span className="font-semibold tabular-nums">{formatRD(c.monto)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Movimientos</p>
        <Movimientos filas={gastos} total={total} totalLabel="Total de la categoría" />
      </div>
    </div>
  );
}
