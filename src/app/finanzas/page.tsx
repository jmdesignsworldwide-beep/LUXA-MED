import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FileText, Plus, Settings2, TrendingUp } from "lucide-react";

import { FinanzasResumen } from "@/components/finanzas/resumen-interactivo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatFecha, formatRD } from "@/lib/format";
import { resumenFinanciero } from "@/lib/finanzas-datos";
import { mesesEnRango, parsePeriodo, periodoAnterior, type RangoClave } from "@/lib/periodo";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RANGOS: { key: RangoClave; label: string }[] = [
  { key: "este_mes", label: "Este mes" },
  { key: "mes_pasado", label: "Mes pasado" },
  { key: "este_anio", label: "Este año" },
  { key: "todo", label: "Todo" },
  { key: "personalizado", label: "Personalizado" },
];

export default async function FinanzasPage({
  searchParams,
}: {
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
  if (perfil?.role !== "admin") redirect("/");

  const p = parsePeriodo(searchParams);
  const categoria = (searchParams.categoria ?? "").trim();
  const ant = periodoAnterior(p.desde, p.hasta);

  const [r, rAnt, { data: cats }] = await Promise.all([
    resumenFinanciero(supabase, p.desde, p.hasta, categoria || undefined),
    resumenFinanciero(supabase, ant.desde, ant.hasta),
    supabase.from("categorias_gasto").select("id, nombre").order("nombre"),
  ]);

  const deltaGasto = r.salio - rAnt.salio;
  const deltaPct = rAnt.salio > 0 ? (deltaGasto / rAnt.salio) * 100 : null;

  const qs = (extra: Record<string, string>) => {
    const sp = new URLSearchParams();
    sp.set("rango", p.rango);
    if (p.rango === "personalizado") {
      sp.set("desde", p.desde);
      sp.set("hasta", p.hasta);
    }
    if (categoria) sp.set("categoria", categoria);
    Object.entries(extra).forEach(([k, v]) => sp.set(k, v));
    return sp.toString();
  };

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
            <Button asChild variant="outline" size="sm"><Link href="/finanzas/categorias"><Settings2 className="h-4 w-4" /> Categorías</Link></Button>
          </div>
        </div>

        {searchParams.creado && (
          <div role="status" className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ {searchParams.creado === "ingreso" ? "Ingreso" : "Gasto"} registrado correctamente.
          </div>
        )}

        {/* Acciones */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="vital"><Link href="/finanzas/ingreso/nuevo"><Plus className="h-4 w-4" /> Registrar ingreso</Link></Button>
          <Button asChild><Link href="/finanzas/gasto/nuevo"><Plus className="h-4 w-4" /> Registrar gasto</Link></Button>
        </div>

        {/* Filtros */}
        <form method="get" className="mt-6 flex flex-wrap items-end gap-3 rounded-capsule border border-border/70 bg-card p-4 shadow-soft">
          <div className="space-y-1">
            <Label htmlFor="rango">Período</Label>
            <Select id="rango" name="rango" defaultValue={p.rango}>
              {RANGOS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="categoria">Categoría (gastos)</Label>
            <Select id="categoria" name="categoria" defaultValue={categoria}>
              <option value="">Todas</option>
              {(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="desde">Desde</Label>
            <Input id="desde" name="desde" type="date" defaultValue={p.desde} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="hasta">Hasta</Label>
            <Input id="hasta" name="hasta" type="date" defaultValue={p.hasta} />
          </div>
          <Button type="submit" variant="default">Aplicar</Button>
          <Button asChild variant="ghost"><Link href="/finanzas">Limpiar</Link></Button>
        </form>

        {/* Frase en cristiano */}
        <div className="mt-6 rounded-capsule border border-brand-cyan/30 bg-brand-cyan/5 p-6">
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
              : "Sin gastos registrados en el período."}
            {deltaPct !== null && (
              <>
                {" "}El gasto{" "}
                {deltaGasto > 0 ? "subió" : deltaGasto < 0 ? "bajó" : "se mantuvo"}{" "}
                <strong>{Math.abs(Math.round(deltaPct))}%</strong> vs. el período anterior.
              </>
            )}
          </p>
        </div>

        {/* Tarjetas interactivas + gasto por categoría (clic = detalle) */}
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
        />

        {/* Tablas */}
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
