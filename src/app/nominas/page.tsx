import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FileText, Plus, Search, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { METODOS_PAGO, METODO_PAGO_LABEL } from "@/lib/constants/nominas";
import { formatFecha, formatRD } from "@/lib/format";
import {
  consultarNominas,
  mesesEnRango,
  parseFiltros,
  type RangoClave,
} from "@/lib/nominas-filtros";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RANGOS: { key: RangoClave; label: string }[] = [
  { key: "este_mes", label: "Este mes" },
  { key: "mes_pasado", label: "Mes pasado" },
  { key: "este_anio", label: "Este año" },
  { key: "todo", label: "Todo" },
  { key: "personalizado", label: "Personalizado" },
];

export default async function NominasPage({
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

  const f = parseFiltros(searchParams);

  const [pagos, { data: empleadosLista }] = await Promise.all([
    consultarNominas(supabase, f),
    supabase
      .from("empleados")
      .select("id, nombre_completo, activo")
      .order("nombre_completo"),
  ]);

  const empleados = empleadosLista ?? [];
  const total = pagos.reduce((a, p) => a + Number(p.monto), 0);
  const promedioMensual = total / mesesEnRango(f.desde, f.hasta);

  // Total por empleado (en el período filtrado).
  const porEmpleado = new Map<string, { nombre: string; total: number; n: number }>();
  for (const p of pagos) {
    const nombre = p.empleados?.nombre_completo ?? "—";
    const cur = porEmpleado.get(p.empleado_id) ?? { nombre, total: 0, n: 0 };
    cur.total += Number(p.monto);
    cur.n += 1;
    porEmpleado.set(p.empleado_id, cur);
  }

  // Estado de pago: empleados activos que cobraron vs. los que faltan.
  const pagaron = new Set(pagos.map((p) => p.empleado_id));
  const activos = empleados.filter((e) => e.activo);
  const cobraron = activos.filter((e) => pagaron.has(e.id));
  const faltan = activos.filter((e) => !pagaron.has(e.id));

  // Querystring actual (para exportar y conservar filtros).
  const qs = new URLSearchParams();
  if (f.q) qs.set("q", f.q);
  if (f.empleado) qs.set("empleado", f.empleado);
  if (f.metodo) qs.set("metodo", f.metodo);
  qs.set("rango", f.rango);
  if (f.rango === "personalizado") {
    qs.set("desde", f.desde);
    qs.set("hasta", f.hasta);
  }
  const qsStr = qs.toString();

  return (
    <main className="min-h-screen">
      <div className="container py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Nómina</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatFecha(f.desde)} – {formatFecha(f.hasta)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/nominas/export?${qsStr}&formato=csv`}>
                <Download className="h-4 w-4" /> Excel
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/nominas/export?${qsStr}&formato=pdf`} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4" /> PDF
              </a>
            </Button>
            <Button asChild variant="vital">
              <Link href="/nominas/nuevo">
                <Plus className="h-4 w-4" /> Registrar pago
              </Link>
            </Button>
          </div>
        </div>

        {searchParams.creado === "1" && (
          <div role="status" className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ Pago registrado correctamente.
          </div>
        )}

        {/* Filtros */}
        <form method="get" className="mt-6 rounded-capsule border border-border/70 bg-card p-4 shadow-soft">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="q">Buscar empleado</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="q" name="q" defaultValue={f.q} placeholder="Nombre…" className="pl-9" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="empleado">Empleado</Label>
              <Select id="empleado" name="empleado" defaultValue={f.empleado}>
                <option value="">Todos</option>
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre_completo}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="metodo">Método</Label>
              <Select id="metodo" name="metodo" defaultValue={f.metodo}>
                <option value="">Todos</option>
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>{METODO_PAGO_LABEL[m]}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rango">Período</Label>
              <Select id="rango" name="rango" defaultValue={f.rango}>
                {RANGOS.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="desde">Desde</Label>
              <Input id="desde" name="desde" type="date" defaultValue={f.desde} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hasta">Hasta</Label>
              <Input id="hasta" name="hasta" type="date" defaultValue={f.hasta} />
            </div>
            <p className="text-xs text-muted-foreground">
              (Las fechas aplican con el período <strong>Personalizado</strong>.)
            </p>
            <div className="ml-auto flex gap-2">
              <Button type="submit" variant="default">Aplicar</Button>
              <Button asChild variant="ghost">
                <Link href="/nominas">Limpiar</Link>
              </Button>
            </div>
          </div>
        </form>

        {/* Totales inteligentes */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Card className="p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-pill bg-accent text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">Total del período</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatRD(total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{pagos.length} pagos</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Promedio mensual</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatRD(promedioMensual)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{mesesEnRango(f.desde, f.hasta)} mes(es)</p>
          </Card>
          <Card className={`p-6 ${faltan.length > 0 ? "border-amber-500/50" : ""}`}>
            <p className="text-sm font-medium text-muted-foreground">Estado de pago</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {cobraron.length}/{activos.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {faltan.length === 0 ? "Todos al día" : `Faltan ${faltan.length}`}
            </p>
          </Card>
        </div>

        {/* Total por empleado + estado detallado */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Total por empleado
            </h2>
            {porEmpleado.size === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Sin pagos en el período.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {Array.from(porEmpleado.values())
                  .sort((a, b) => b.total - a.total)
                  .map((e) => (
                    <li key={e.nombre} className="flex items-center justify-between gap-4 text-sm">
                      <span>{e.nombre} <span className="text-muted-foreground">· {e.n}</span></span>
                      <span className="font-semibold tabular-nums">{formatRD(e.total)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Quién cobró / quién falta
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-emerald-600 dark:text-emerald-400">
                  Cobraron ({cobraron.length})
                </p>
                <ul className="space-y-1 text-sm">
                  {cobraron.map((e) => <li key={e.id}>{e.nombre_completo}</li>)}
                  {cobraron.length === 0 && <li className="text-muted-foreground">—</li>}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-amber-600 dark:text-amber-400">
                  Faltan ({faltan.length})
                </p>
                <ul className="space-y-1 text-sm">
                  {faltan.map((e) => <li key={e.id}>{e.nombre_completo}</li>)}
                  {faltan.length === 0 && <li className="text-muted-foreground">—</li>}
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabla de pagos */}
        <div className="mt-6 overflow-hidden rounded-capsule border border-border/70 bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Empleado</th>
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Período</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Método</th>
                  <th className="px-5 py-3 font-medium">Monto</th>
                  <th className="px-5 py-3 font-medium">Recibo</th>
                </tr>
              </thead>
              <tbody>
                {pagos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                      No hay pagos con estos filtros.
                    </td>
                  </tr>
                ) : (
                  pagos.map((p) => (
                    <tr key={p.id} className="border-b border-border/40 last:border-0">
                      <td className="px-5 py-3 font-medium">{p.empleados?.nombre_completo ?? "—"}</td>
                      <td className="px-5 py-3 tabular-nums text-muted-foreground">{formatFecha(p.fecha_pago)}</td>
                      <td className="hidden px-5 py-3 text-muted-foreground md:table-cell">{p.periodo}</td>
                      <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">{METODO_PAGO_LABEL[p.metodo] ?? p.metodo}</td>
                      <td className="px-5 py-3 font-semibold tabular-nums">{formatRD(Number(p.monto))}</td>
                      <td className="px-5 py-3">
                        <a href={`/nominas/${p.id}/recibo`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          <Download className="h-3.5 w-3.5" /> PDF
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
