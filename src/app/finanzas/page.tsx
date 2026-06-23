import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarRange, Download, FileText, Plus, TrendingUp } from "lucide-react";

import { FiltroCategorias } from "@/components/finanzas/filtro-categorias";
import { FinanzasResumen } from "@/components/finanzas/resumen-interactivo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatFecha, formatRD } from "@/lib/format";
import { resumenFinanciero, serieMensualCategorias } from "@/lib/finanzas-datos";
import { mesesEnRango, parsePeriodo, periodoAnterior } from "@/lib/periodo";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Une nombres: "A", "A y B", "A, B y C". */
function unir(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
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
  if (perfil?.role !== "admin") redirect("/");

  const p = parsePeriodo(searchParams);
  const ant = periodoAnterior(p.desde, p.hasta);

  const catParam = searchParams.cat;
  const seleccion = Array.isArray(catParam) ? catParam : catParam ? [catParam] : [];

  const { data: catsRaw } = await supabase
    .from("categorias_gasto")
    .select("id, nombre, activo")
    .order("nombre");
  const cats = (catsRaw ?? []) as { id: string; nombre: string; activo: boolean }[];
  const nominaId = cats.find((c) => c.nombre === "Nóminas")?.id;
  const incluirNomina = seleccion.length === 0 || (!!nominaId && seleccion.includes(nominaId));

  const [r, rAnt, serie] = await Promise.all([
    resumenFinanciero(supabase, p.desde, p.hasta, seleccion, incluirNomina),
    resumenFinanciero(supabase, ant.desde, ant.hasta, seleccion, incluirNomina),
    serieMensualCategorias(supabase, p.hasta, 6),
  ]);

  const deltaGasto = r.salio - rAnt.salio;
  const deltaPct = rAnt.salio > 0 ? (deltaGasto / rAnt.salio) * 100 : null;

  // Totales del período anterior por categoría (para comparar en el desglose).
  const anteriorPorCat: Record<string, number> = {};
  rAnt.porCategoria.forEach((c) => (anteriorPorCat[c.categoria] = c.monto));

  const nombresSel = cats.filter((c) => seleccion.includes(c.id)).map((c) => c.nombre);
  const titulo = seleccion.length === 0 ? "Todas las categorías" : unir(nombresSel);

  // Querystring para exportar (conserva fechas + categorías).
  const qs = (extra: Record<string, string>) => {
    const sp = new URLSearchParams();
    sp.set("desde", p.desde);
    sp.set("hasta", p.hasta);
    seleccion.forEach((id) => sp.append("cat", id));
    Object.entries(extra).forEach(([k, v]) => sp.set(k, v));
    return sp.toString();
  };

  const creado = Array.isArray(searchParams.creado) ? searchParams.creado[0] : searchParams.creado;

  return (
    <main className="min-h-screen">
      <div className="container py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Panel financiero</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatFecha(p.desde)} – {formatFecha(p.hasta)} · gerencial (no fiscal)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm"><a href={`/finanzas/export?${qs({ formato: "csv" })}`}><Download className="h-4 w-4" /> Excel</a></Button>
            <Button asChild variant="outline" size="sm"><a href={`/finanzas/export?${qs({ formato: "pdf" })}`} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" /> PDF</a></Button>
          </div>
        </div>

        {creado && (
          <div role="status" className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ {creado === "ingreso" ? "Ingreso" : "Gasto"} registrado correctamente.
          </div>
        )}

        {/* Acciones */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="vital"><Link href="/finanzas/ingreso/nuevo"><Plus className="h-4 w-4" /> Registrar ingreso</Link></Button>
          <Button asChild><Link href="/finanzas/gasto/nuevo"><Plus className="h-4 w-4" /> Registrar gasto</Link></Button>
        </div>

        {/* Filtro de fechas (premium) */}
        <form method="get" className="mt-6 rounded-capsule border border-border/70 bg-card p-5 shadow-soft">
          {/* conserva las categorías seleccionadas al cambiar fechas */}
          {seleccion.map((id) => <input key={id} type="hidden" name="cat" value={id} />)}
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarRange className="h-5 w-5 text-primary" />
              Rango de fechas
            </div>
            <div className="space-y-1">
              <Label htmlFor="desde" className="text-xs">Desde</Label>
              <Input id="desde" name="desde" type="date" defaultValue={p.desde} className="h-11" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hasta" className="text-xs">Hasta</Label>
              <Input id="hasta" name="hasta" type="date" defaultValue={p.hasta} className="h-11" />
            </div>
            <Button type="submit" variant="default">Aplicar</Button>
            <Button asChild variant="ghost"><Link href="/finanzas">Mes actual</Link></Button>
          </div>
        </form>

        {/* Filtro multi-categoría (chips) */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Categorías de gasto</p>
            <Link href="/finanzas/categorias" className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
              Gestionar categorías y subcategorías
            </Link>
          </div>
          <FiltroCategorias categorias={cats} seleccion={seleccion} />
        </div>

        {/* Título dinámico de lo que se está viendo */}
        <p className="mt-5 text-sm text-muted-foreground">
          Viendo: <strong className="text-foreground">{titulo}</strong>
        </p>

        {/* Resumen en cristiano */}
        <div className="mt-3 rounded-capsule border border-brand-cyan/30 bg-brand-cyan/5 p-6">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
            <TrendingUp className="h-4 w-4" /> Resumen del período
          </p>
          <p className="mt-3 text-lg leading-relaxed">
            Entró <strong className="text-emerald-600 dark:text-emerald-400">{formatRD(r.entro)}</strong>,
            salió <strong className="text-destructive">{formatRD(r.salio)}</strong>, margen{" "}
            <strong className={r.margen >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
              {formatRD(r.margen)} ({Math.round(r.margenPct)}%)
            </strong>
            .{" "}
            {r.mayorGasto
              ? <>Tu mayor gasto fue <strong>{r.mayorGasto.categoria}</strong> ({formatRD(r.mayorGasto.monto)}).</>
              : "Sin gastos en la selección."}
            {deltaPct !== null && (
              <>
                {" "}El gasto{" "}
                {deltaGasto > 0 ? "subió" : deltaGasto < 0 ? "bajó" : "se mantuvo"}{" "}
                <strong>{Math.abs(Math.round(deltaPct))}%</strong> vs. el período anterior.
              </>
            )}
          </p>
        </div>

        {/* Tarjetas interactivas + gasto por categoría */}
        <FinanzasResumen
          entro={r.entro}
          salio={r.salio}
          margen={r.margen}
          margenPct={r.margenPct}
          meses={mesesEnRango(p.desde, p.hasta)}
          gastos={r.gastos}
          ingresos={r.ingresos}
          porCategoria={r.porCategoria}
          mayorGasto={r.mayorGasto}
          anterior={{ entro: rAnt.entro, salio: rAnt.salio, margen: rAnt.margen, porCategoria: anteriorPorCat }}
          serie={serie}
        />

        {/* Tablas completas */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Gastos ({r.gastos.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Fecha</th>
                    <th className="px-2 py-2 font-medium">Categoría</th>
                    <th className="px-2 py-2 font-medium">Concepto</th>
                    <th className="px-2 py-2 font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {r.gastos.length === 0 ? (
                    <tr><td colSpan={4} className="px-2 py-8 text-center text-muted-foreground">Sin gastos.</td></tr>
                  ) : r.gastos.map((g) => (
                    <tr key={`${g.id}-${g.categoria}`} className="border-b border-border/40 last:border-0">
                      <td className="px-2 py-2 whitespace-nowrap tabular-nums text-muted-foreground">{formatFecha(g.fecha)}</td>
                      <td className="px-2 py-2">{g.categoria}</td>
                      <td className="px-2 py-2 text-muted-foreground">{g.concepto || "—"}</td>
                      <td className="px-2 py-2 font-semibold tabular-nums">{formatRD(g.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ingresos ({r.ingresos.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Fecha</th>
                    <th className="px-2 py-2 font-medium">Concepto</th>
                    <th className="px-2 py-2 font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {r.ingresos.length === 0 ? (
                    <tr><td colSpan={3} className="px-2 py-8 text-center text-muted-foreground">Sin ingresos.</td></tr>
                  ) : r.ingresos.map((i) => (
                    <tr key={i.id} className="border-b border-border/40 last:border-0">
                      <td className="px-2 py-2 whitespace-nowrap tabular-nums text-muted-foreground">{formatFecha(i.fecha)}</td>
                      <td className="px-2 py-2">{i.concepto}</td>
                      <td className="px-2 py-2 font-semibold tabular-nums">{formatRD(i.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
