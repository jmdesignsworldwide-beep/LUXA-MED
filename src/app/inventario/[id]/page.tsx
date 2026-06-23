import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Pencil,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { cambiarEstadoInsumo } from "@/app/inventario/actions";
import { EntradaForm, SalidaForm } from "@/components/inventario/movimiento-forms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatFecha, formatRD } from "@/lib/format";
import {
  calcularInteligencia,
  fraseProyeccion,
  nivelAlerta,
  type Insumo,
  type Movimiento,
} from "@/lib/inventario-datos";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALERTA_BADGE: Record<string, string> = {
  critico: "bg-destructive/15 text-destructive",
  bajo: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};
const ALERTA_LABEL: Record<string, string> = {
  critico: "Stock crítico",
  bajo: "Bajo stock",
  ok: "Stock OK",
};

export default async function InsumoDetallePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | undefined>;
}) {
  if (!getSupabaseServerConfig().configured) redirect("/login");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const rol = perfil?.role ?? "recepcion";
  const esAdmin = rol === "admin";
  const esClinico = rol === "admin" || rol === "enfermera";

  const { data: insumoRaw } = await supabase
    .from("insumos")
    .select(
      "id, nombre, categoria_id, unidad, stock, nivel_minimo, costo_unitario, proveedor, activo, categorias_insumo(nombre)",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!insumoRaw) notFound();
  const catRel = (insumoRaw as { categorias_insumo?: { nombre: string } | { nombre: string }[] | null }).categorias_insumo;
  const categoriaNombre = Array.isArray(catRel) ? catRel[0]?.nombre ?? null : catRel?.nombre ?? null;
  const insumo = { ...(insumoRaw as object), categoria: categoriaNombre } as Insumo;

  const { data: movsRaw } = await supabase
    .from("insumo_movimientos")
    .select("id, tipo, cantidad, costo_unitario, motivo, fecha, created_at")
    .eq("insumo_id", insumo.id)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  const movimientos = (movsRaw ?? []) as Movimiento[];

  const intel = calcularInteligencia(insumo, movimientos);
  const alerta = nivelAlerta(Number(insumo.stock), Number(insumo.nivel_minimo));
  const archivar = cambiarEstadoInsumo.bind(null, insumo.id, false);

  const aviso =
    searchParams.creado === "1"
      ? "Insumo creado correctamente."
      : searchParams.actualizado === "1"
        ? "Cambios guardados."
        : searchParams.mov === "entrada"
          ? "Entrada registrada: stock actualizado."
          : searchParams.mov === "salida"
            ? "Salida registrada: stock actualizado."
            : null;

  return (
    <main className="min-h-screen">
      <div className="container py-10">
        <Link
          href="/inventario"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Inventario
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{insumo.nombre}</h1>
              <span className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${ALERTA_BADGE[alerta]}`}>
                {ALERTA_LABEL[alerta]}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {insumo.categoria ?? "Sin categoría"}
              {insumo.proveedor ? ` · ${insumo.proveedor}` : ""}
            </p>
          </div>
          {esAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/inventario/${insumo.id}/editar`}>
                  <Pencil className="h-4 w-4" /> Editar
                </Link>
              </Button>
              <ConfirmDialog
                triggerLabel="Archivar"
                triggerVariant="ghost"
                title="¿Archivar este insumo?"
                description="Dejará de aparecer en el inventario activo. El historial de movimientos se conserva."
                confirmLabel="Archivar"
                action={archivar}
              />
            </div>
          )}
        </div>

        {aviso && (
          <div role="status" className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ {aviso}
          </div>
        )}

        {/* Stock + inteligencia */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Stock actual</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {Number(insumo.stock)} <span className="text-base font-normal text-muted-foreground">{insumo.unidad}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Mínimo: {Number(insumo.nivel_minimo)} {insumo.unidad}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Valor en inventario</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatRD(intel.valor)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatRD(Number(insumo.costo_unitario))} c/u</p>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Proyección</p>
            </div>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {intel.diasRestantes != null ? `${intel.diasRestantes} d` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {fraseProyeccion(insumo.nombre, insumo.unidad, intel, Number(insumo.stock))}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Consumo mensual</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {intel.consumoMensualProm.toFixed(1)} <span className="text-base font-normal text-muted-foreground">{insumo.unidad}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">≈ {formatRD(intel.consumoValorMensual)}/mes</p>
          </Card>
        </div>

        {/* Patrón de consumo */}
        <Card className="mt-5 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Patrón de consumo
          </h2>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{intel.salidas30} {insumo.unidad}</p>
              <p className="text-xs text-muted-foreground">Últimos 30 días</p>
            </div>
            <div>
              <p className="text-lg font-medium tabular-nums text-muted-foreground">{intel.salidasPrev30} {insumo.unidad}</p>
              <p className="text-xs text-muted-foreground">30 días anteriores</p>
            </div>
            {intel.deltaPct != null && (intel.salidas30 > 0 || intel.salidasPrev30 > 0) && (
              <div
                className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-sm font-medium ${
                  intel.deltaPct > 0
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : intel.deltaPct < 0
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {intel.deltaPct > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {intel.deltaPct > 0 ? "+" : ""}
                {intel.deltaPct.toFixed(0)}% vs. período anterior
              </div>
            )}
            {intel.deltaPct == null && (
              <p className="text-sm text-muted-foreground">Sin consumo previo para comparar.</p>
            )}
          </div>
        </Card>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Historial de movimientos */}
          <section className="lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Historial de movimientos
            </h2>
            <div className="mt-4 overflow-hidden rounded-capsule border border-border/70 bg-card shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Fecha</th>
                      <th className="px-5 py-3 font-medium">Tipo</th>
                      <th className="px-5 py-3 font-medium">Cantidad</th>
                      <th className="hidden px-5 py-3 font-medium sm:table-cell">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center text-muted-foreground">
                          Aún no hay movimientos.
                        </td>
                      </tr>
                    ) : (
                      movimientos.map((m) => (
                        <tr key={m.id} className="border-b border-border/40 last:border-0">
                          <td className="px-5 py-3 tabular-nums text-muted-foreground">{formatFecha(m.fecha)}</td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${
                                m.tipo === "entrada"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {m.tipo === "entrada" ? "Entrada" : "Salida"}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-semibold tabular-nums">
                            {m.tipo === "entrada" ? "+" : "−"}
                            {Number(m.cantidad)} {insumo.unidad}
                          </td>
                          <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">{m.motivo ?? "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Acciones según rol */}
          <aside className="space-y-5">
            {esAdmin && (
              <Card className="p-6">
                <EntradaForm
                  insumoId={insumo.id}
                  costoSugerido={Number(insumo.costo_unitario)}
                  unidad={insumo.unidad}
                />
              </Card>
            )}
            {esClinico ? (
              <Card className="p-6">
                <SalidaForm insumoId={insumo.id} unidad={insumo.unidad} />
              </Card>
            ) : (
              <Card className="p-6 text-sm text-muted-foreground">
                Tienes acceso de solo lectura al inventario.
              </Card>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
