import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Lock, Trash2 } from "lucide-react";

import {
  borrarCategoriaInsumo,
  crearCategoriaInsumo,
  renombrarCategoriaInsumo,
} from "@/app/inventario/actions";
import { CategoriaInline } from "@/components/inventario/categoria-inline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Cat = { id: string; nombre: string; es_sistema: boolean };

export default async function CategoriasInsumoPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
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
  if (perfil?.role !== "admin") redirect("/inventario");

  const [{ data: cats }, { data: insumos }] = await Promise.all([
    supabase
      .from("categorias_insumo")
      .select("id, nombre, es_sistema")
      .eq("activo", true)
      .order("es_sistema", { ascending: false })
      .order("nombre"),
    supabase.from("insumos").select("categoria_id").eq("activo", true),
  ]);
  const categorias = (cats ?? []) as Cat[];

  // Cuántos insumos tiene cada categoría (para proteger de borrado y mostrar).
  const conteo = new Map<string, number>();
  for (const i of insumos ?? []) {
    if (i.categoria_id) conteo.set(i.categoria_id, (conteo.get(i.categoria_id) ?? 0) + 1);
  }

  return (
    <main className="min-h-screen">
      <div className="container max-w-3xl py-10">
        <Link
          href="/inventario"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Inventario
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Categorías de insumos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organiza tus insumos. Las categorías con insumos asignados no se pueden borrar (para no dejar insumos huérfanos).
        </p>

        {searchParams.ok && (
          <div role="status" className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ Cambios guardados.
          </div>
        )}
        {searchParams.error === "enuso" && (
          <div role="alert" className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Esa categoría tiene insumos asignados; no se puede borrar.
          </div>
        )}

        <div className="mt-8 rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Nueva categoría</h2>
          <CategoriaInline action={crearCategoriaInsumo} placeholder="Ej. Reactivos" />
        </div>

        <ul className="mt-6 space-y-3">
          {categorias.map((c) => {
            const n = conteo.get(c.id) ?? 0;
            return (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-capsule border border-border/70 bg-card p-4 shadow-soft"
              >
                <form action={renombrarCategoriaInsumo.bind(null, c.id)} className="flex flex-1 items-center gap-2">
                  {c.es_sistema && <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <Input name="nombre" defaultValue={c.nombre} className="h-9 max-w-xs" />
                  <Button type="submit" size="sm" variant="outline">Guardar</Button>
                </form>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{n} insumo{n === 1 ? "" : "s"}</span>
                  {n === 0 ? (
                    <form action={borrarCategoriaInsumo.bind(null, c.id)}>
                      <Button type="submit" size="sm" variant="ghost" aria-label="Borrar categoría">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  ) : (
                    <span title="Tiene insumos asignados" className="text-muted-foreground/50">
                      <Trash2 className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </li>
            );
          })}
          {categorias.length === 0 && (
            <li className="text-sm text-muted-foreground">Aún no hay categorías.</li>
          )}
        </ul>
      </div>
    </main>
  );
}
