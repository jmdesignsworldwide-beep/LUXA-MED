import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Boxes, Package, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatRD } from "@/lib/format";
import { nivelAlerta, valorInsumo, type Insumo } from "@/lib/inventario-datos";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALERTA_BADGE: Record<string, string> = {
  critico: "bg-destructive/15 text-destructive",
  bajo: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};
const ALERTA_LABEL: Record<string, string> = {
  critico: "Crítico",
  bajo: "Bajo",
  ok: "OK",
};

export default async function InventarioPage({
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
  const esAdmin = perfil?.role === "admin";

  const q = (searchParams.q ?? "").trim();
  const categoria = (searchParams.categoria ?? "").trim();

  let query = supabase
    .from("insumos")
    .select("id, nombre, categoria, unidad, stock, nivel_minimo, costo_unitario, proveedor, activo")
    .eq("activo", true)
    .order("nombre");
  if (q) query = query.ilike("nombre", `%${q}%`);
  if (categoria) query = query.eq("categoria", categoria);

  const { data } = await query;
  const insumos = (data ?? []) as Insumo[];

  // Para el filtro de categorías necesitamos todas (no solo las filtradas).
  const { data: todasCat } = await supabase
    .from("insumos")
    .select("categoria")
    .eq("activo", true);
  const categorias = Array.from(
    new Set((todasCat ?? []).map((r) => r.categoria).filter((c): c is string => !!c)),
  ).sort();

  const valorTotal = insumos.reduce((a, i) => a + valorInsumo(i), 0);
  const conAlerta = insumos.filter(
    (i) => nivelAlerta(Number(i.stock), Number(i.nivel_minimo)) !== "ok",
  );

  return (
    <main className="min-h-screen">
      <div className="container py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Inventario</h1>
            <p className="mt-1 text-sm text-muted-foreground">Insumos médicos y existencias</p>
          </div>
          {esAdmin && (
            <Button asChild variant="vital">
              <Link href="/inventario/nuevo">
                <Plus className="h-4 w-4" /> Nuevo insumo
              </Link>
            </Button>
          )}
        </div>

        {searchParams.eliminado === "1" && (
          <div role="status" className="mt-6 rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-sm">
            El insumo fue archivado.
          </div>
        )}

        {/* Resumen */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Card className="p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-pill bg-accent text-primary">
              <Boxes className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">Insumos activos</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{insumos.length}</p>
          </Card>
          <Card className="p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-pill bg-accent text-primary">
              <Package className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">Valor del inventario</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatRD(valorTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Stock × costo unitario</p>
          </Card>
          <Card className={`p-6 ${conAlerta.length > 0 ? "border-amber-500/50" : ""}`}>
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-pill ${
                conAlerta.length > 0
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : "bg-accent text-primary"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">Bajo stock</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{conAlerta.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {conAlerta.length === 0 ? "Todo en nivel" : "Requieren reposición"}
            </p>
          </Card>
        </div>

        {/* Buscador + filtro */}
        <form method="get" className="mt-6 rounded-capsule border border-border/70 bg-card p-4 shadow-soft">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="space-y-1">
              <Label htmlFor="q">Buscar insumo</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="q" name="q" defaultValue={q} placeholder="Nombre…" className="pl-9" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="categoria">Categoría</Label>
              <Select id="categoria" name="categoria" defaultValue={categoria}>
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" variant="default">Aplicar</Button>
              <Button asChild variant="ghost">
                <Link href="/inventario">Limpiar</Link>
              </Button>
            </div>
          </div>
        </form>

        {/* Lista */}
        <div className="mt-6 overflow-hidden rounded-capsule border border-border/70 bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Insumo</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Categoría</th>
                  <th className="px-5 py-3 font-medium">Stock</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Valor</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {insumos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                      No hay insumos con estos filtros.
                    </td>
                  </tr>
                ) : (
                  insumos.map((i) => {
                    const alerta = nivelAlerta(Number(i.stock), Number(i.nivel_minimo));
                    return (
                      <tr key={i.id} className="border-b border-border/40 last:border-0 hover:bg-accent/40">
                        <td className="px-5 py-3">
                          <Link href={`/inventario/${i.id}`} className="font-medium hover:text-primary">
                            {i.nombre}
                          </Link>
                          {i.proveedor && (
                            <p className="text-xs text-muted-foreground">{i.proveedor}</p>
                          )}
                        </td>
                        <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">
                          {i.categoria ?? "—"}
                        </td>
                        <td className="px-5 py-3 tabular-nums">
                          {Number(i.stock)} <span className="text-muted-foreground">{i.unidad}</span>
                          <span className="block text-xs text-muted-foreground">
                            mín. {Number(i.nivel_minimo)}
                          </span>
                        </td>
                        <td className="hidden px-5 py-3 tabular-nums text-muted-foreground md:table-cell">
                          {formatRD(valorInsumo(i))}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${ALERTA_BADGE[alerta]}`}
                          >
                            {ALERTA_LABEL[alerta]}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
