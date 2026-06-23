"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Minus,
  X,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatFecha, formatRD } from "@/lib/format";

type GastoFila = {
  id: string;
  fecha: string;
  categoria: string;
  concepto: string;
  monto: number;
};
type IngresoFila = { id: string; fecha: string; concepto: string; monto: number };
type Cat = { categoria: string; monto: number };

type Detalle =
  | { tipo: "entro" }
  | { tipo: "salio" }
  | { tipo: "margen" }
  | { tipo: "categoria"; categoria: string }
  | null;

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
}) {
  const [detalle, setDetalle] = React.useState<Detalle>(null);

  const toggle = (d: Detalle) =>
    setDetalle((prev) =>
      prev && JSON.stringify(prev) === JSON.stringify(d) ? null : d,
    );

  const activa = (cond: boolean) =>
    cond ? "ring-2 ring-primary/60" : "";

  return (
    <div className="mt-6">
      {/* Tarjetas (clic = abrir detalle) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <button type="button" onClick={() => toggle({ tipo: "entro" })} className="text-left">
          <Card className={`h-full cursor-pointer p-6 ${activa(detalle?.tipo === "entro")}`}>
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-pill bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">Entró</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatRD(entro)}</p>
          </Card>
        </button>

        <button type="button" onClick={() => toggle({ tipo: "salio" })} className="text-left">
          <Card className={`h-full cursor-pointer p-6 ${activa(detalle?.tipo === "salio")}`}>
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-pill bg-destructive/15 text-destructive">
                <ArrowDownRight className="h-5 w-5" />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">Salió</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatRD(salio)}</p>
          </Card>
        </button>

        <button type="button" onClick={() => toggle({ tipo: "margen" })} className="text-left">
          <Card className={`h-full cursor-pointer p-6 ${activa(detalle?.tipo === "margen")}`}>
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-pill bg-accent text-primary">
                <Minus className="h-5 w-5" />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">Margen</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${margen >= 0 ? "" : "text-destructive"}`}>
              {formatRD(margen)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{Math.round(margenPct)}%</p>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => mayorGasto && toggle({ tipo: "categoria", categoria: mayorGasto.categoria })}
          className="text-left"
          disabled={!mayorGasto}
        >
          <Card
            className={`h-full p-6 ${mayorGasto ? "cursor-pointer" : ""} ${activa(
              detalle?.tipo === "categoria" && detalle.categoria === mayorGasto?.categoria,
            )}`}
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">Mayor gasto</p>
              {mayorGasto && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
            <p className="mt-3 text-lg font-semibold">{mayorGasto?.categoria ?? "—"}</p>
            <p className="mt-1 text-sm tabular-nums text-muted-foreground">
              {mayorGasto ? formatRD(mayorGasto.monto) : ""}
            </p>
          </Card>
        </button>
      </div>

      {/* Panel de detalle que "se abre" */}
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
                  {detalle.tipo === "salio" && "Detalle de gastos por categoría"}
                  {detalle.tipo === "margen" && "Cómo se compone el margen"}
                  {detalle.tipo === "categoria" && `Gastos — ${detalle.categoria}`}
                </h3>
                <button
                  type="button"
                  onClick={() => setDetalle(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-pill text-muted-foreground hover:bg-accent"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {detalle.tipo === "entro" && <DetalleIngresos ingresos={ingresos} total={entro} />}
              {detalle.tipo === "salio" && (
                <DetalleGastosPorCategoria gastos={gastos} porCategoria={porCategoria} total={salio} onCat={(c) => setDetalle({ tipo: "categoria", categoria: c })} />
              )}
              {detalle.tipo === "margen" && (
                <DetalleMargen entro={entro} salio={salio} margen={margen} margenPct={margenPct} meses={meses} />
              )}
              {detalle.tipo === "categoria" && (
                <DetalleCategoria gastos={gastos.filter((g) => g.categoria === detalle.categoria)} />
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gasto por categoría (clic = filtra) */}
      {porCategoria.length > 0 && (
        <Card className="mt-6 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Gasto por categoría
          </h2>
          <ul className="mt-4 space-y-1">
            {porCategoria.map((c) => (
              <li key={c.categoria}>
                <button
                  type="button"
                  onClick={() => toggle({ tipo: "categoria", categoria: c.categoria })}
                  className={`flex w-full items-center justify-between gap-4 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent ${
                    detalle?.tipo === "categoria" && detalle.categoria === c.categoria ? "bg-accent" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    {c.categoria}
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

function MiniTabla({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function DetalleIngresos({ ingresos, total }: { ingresos: IngresoFila[]; total: number }) {
  if (ingresos.length === 0) return <p className="text-sm text-muted-foreground">Sin ingresos en el período.</p>;
  return (
    <>
      <MiniTabla>
        <tbody>
          {ingresos.map((i) => (
            <tr key={i.id} className="border-b border-border/40 last:border-0">
              <td className="py-2 pr-3 whitespace-nowrap tabular-nums text-muted-foreground">{formatFecha(i.fecha)}</td>
              <td className="py-2 pr-3">{i.concepto}</td>
              <td className="py-2 text-right font-semibold tabular-nums">{formatRD(i.monto)}</td>
            </tr>
          ))}
        </tbody>
      </MiniTabla>
      <div className="mt-3 flex justify-between border-t border-border/60 pt-3 text-sm font-semibold">
        <span>Total que entró</span>
        <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{formatRD(total)}</span>
      </div>
    </>
  );
}

function DetalleCategoria({ gastos }: { gastos: GastoFila[] }) {
  const total = gastos.reduce((a, g) => a + g.monto, 0);
  if (gastos.length === 0) return <p className="text-sm text-muted-foreground">Sin gastos en esta categoría.</p>;
  return (
    <>
      <MiniTabla>
        <tbody>
          {gastos.map((g) => (
            <tr key={`${g.id}-${g.fecha}`} className="border-b border-border/40 last:border-0">
              <td className="py-2 pr-3 whitespace-nowrap tabular-nums text-muted-foreground">{formatFecha(g.fecha)}</td>
              <td className="py-2 pr-3">{g.concepto || "—"}</td>
              <td className="py-2 text-right font-semibold tabular-nums">{formatRD(g.monto)}</td>
            </tr>
          ))}
        </tbody>
      </MiniTabla>
      <div className="mt-3 flex justify-between border-t border-border/60 pt-3 text-sm font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatRD(total)}</span>
      </div>
    </>
  );
}

function DetalleGastosPorCategoria({
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
    <div className="space-y-4">
      {porCategoria.map((c) => {
        const filas = gastos.filter((g) => g.categoria === c.categoria);
        return (
          <div key={c.categoria}>
            <button
              type="button"
              onClick={() => onCat(c.categoria)}
              className="flex w-full items-center justify-between text-sm font-semibold hover:text-primary"
            >
              <span>{c.categoria}</span>
              <span className="tabular-nums">{formatRD(c.monto)}</span>
            </button>
            <ul className="mt-1 space-y-0.5 pl-3 text-xs text-muted-foreground">
              {filas.slice(0, 6).map((g) => (
                <li key={`${g.id}-${g.fecha}`} className="flex justify-between gap-3">
                  <span>{formatFecha(g.fecha)} · {g.concepto || "—"}</span>
                  <span className="tabular-nums">{formatRD(g.monto)}</span>
                </li>
              ))}
              {filas.length > 6 && <li className="italic">+{filas.length - 6} más…</li>}
            </ul>
          </div>
        );
      })}
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
}: {
  entro: number;
  salio: number;
  margen: number;
  margenPct: number;
  meses: number;
}) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Entró</span>
        <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{formatRD(entro)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">− Salió</span>
        <span className="tabular-nums text-destructive">{formatRD(salio)}</span>
      </div>
      <div className="flex justify-between border-t border-border/60 pt-2 text-base font-semibold">
        <span>= Margen</span>
        <span className={`tabular-nums ${margen >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
          {formatRD(margen)}
        </span>
      </div>
      <p className="pt-2 text-muted-foreground">
        Margen de <strong>{Math.round(margenPct)}%</strong> sobre lo que entró
        {meses > 1 && <> · promedio mensual del margen: <strong>{formatRD(margen / meses)}</strong></>}.
      </p>
    </div>
  );
}
