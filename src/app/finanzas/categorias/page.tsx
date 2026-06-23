import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Lock, Trash2 } from "lucide-react";

import {
  borrarSubcategoria,
  crearCategoria,
  crearSubcategoria,
  renombrarSubcategoria,
} from "@/app/finanzas/actions";
import { CrearInline } from "@/components/finanzas/crear-inline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Cat = { id: string; nombre: string; es_sistema: boolean };
type Sub = { id: string; nombre: string; categoria_id: string; es_sistema: boolean };

export default async function CategoriasPage({
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
  if (perfil?.role !== "admin") redirect("/");

  const [{ data: cats }, { data: subs }] = await Promise.all([
    supabase.from("categorias_gasto").select("id, nombre, es_sistema").order("es_sistema", { ascending: false }).order("nombre"),
    supabase.from("subcategorias_gasto").select("id, nombre, categoria_id, es_sistema").order("nombre"),
  ]);
  const categorias = (cats ?? []) as Cat[];
  const subcategorias = (subs ?? []) as Sub[];
  const subsDe = (catId: string) => subcategorias.filter((s) => s.categoria_id === catId);

  return (
    <main className="min-h-screen">
      <div className="container max-w-3xl py-10">
        <Link href="/finanzas" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Finanzas
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Categorías y subcategorías</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organiza tus gastos en dos niveles. Las subcategorías con gastos no se pueden borrar (para no romper datos).
        </p>

        {searchParams.ok && (
          <div role="status" className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ Cambios guardados.
          </div>
        )}
        {searchParams.error === "enuso" && (
          <div role="alert" className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Esa subcategoría tiene gastos amarrados; no se puede borrar.
          </div>
        )}

        <div className="mt-8 rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Nueva categoría madre</h2>
          <CrearInline action={crearCategoria} placeholder="Ej. Marketing" />
        </div>

        <div className="mt-6 space-y-4">
          {categorias.map((c) => (
            <div key={c.id} className="rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                {c.es_sistema && <Lock className="h-4 w-4 text-muted-foreground" />}
                {c.nombre}
              </h3>

              <ul className="mt-3 space-y-2">
                {subsDe(c.id).length === 0 && (
                  <li className="text-sm text-muted-foreground">Sin subcategorías todavía.</li>
                )}
                {subsDe(c.id).map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                    <form action={renombrarSubcategoria.bind(null, s.id)} className="flex flex-1 items-center gap-2">
                      <Input name="nombre" defaultValue={s.nombre} className="h-9 max-w-xs" />
                      <Button type="submit" size="sm" variant="outline">Guardar</Button>
                    </form>
                    <form action={borrarSubcategoria.bind(null, s.id)}>
                      <Button type="submit" size="sm" variant="ghost" aria-label="Borrar subcategoría">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>

              <div className="mt-4 max-w-md">
                <CrearInline action={crearSubcategoria.bind(null, c.id)} placeholder="Nueva subcategoría…" size="sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
