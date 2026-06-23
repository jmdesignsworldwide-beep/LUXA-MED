import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";

import { alternarCategoria, renombrarCategoria } from "@/app/finanzas/actions";
import { CategoriaCrear } from "@/components/finanzas/categoria-crear";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Cat = { id: string; nombre: string; es_sistema: boolean; activo: boolean };

export default async function CategoriasPage() {
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

  const { data } = await supabase
    .from("categorias_gasto")
    .select("id, nombre, es_sistema, activo")
    .order("es_sistema", { ascending: false })
    .order("nombre");
  const categorias = (data ?? []) as Cat[];

  return (
    <main className="min-h-screen">
      <div className="container max-w-2xl py-10">
        <Link href="/finanzas" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Finanzas
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Categorías de gasto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Las base no se pueden borrar. Puedes añadir y editar las tuyas.
        </p>

        <div className="mt-8 rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
          <CategoriaCrear />
        </div>

        <ul className="mt-6 space-y-2">
          {categorias.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-capsule border border-border/70 bg-card px-4 py-3 shadow-soft">
              {c.es_sistema ? (
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  {c.nombre}
                  <span className="text-xs text-muted-foreground">(base)</span>
                </span>
              ) : (
                <form action={renombrarCategoria.bind(null, c.id)} className="flex flex-1 items-center gap-2">
                  <Input name="nombre" defaultValue={c.nombre} className="max-w-xs" />
                  <Button type="submit" size="sm" variant="outline">Guardar</Button>
                </form>
              )}
              <div className="flex items-center gap-2">
                {!c.activo && <span className="text-xs text-muted-foreground">Inactiva</span>}
                {!c.es_sistema && (
                  <form action={alternarCategoria.bind(null, c.id, !c.activo)}>
                    <Button type="submit" size="sm" variant="ghost">
                      {c.activo ? "Desactivar" : "Activar"}
                    </Button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
