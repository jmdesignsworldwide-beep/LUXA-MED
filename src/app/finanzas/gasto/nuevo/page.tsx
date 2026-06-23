import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { GastoForm } from "@/components/finanzas/forms";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NuevoGastoPage() {
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

  const { data: categorias } = await supabase
    .from("categorias_gasto")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");

  return (
    <main className="min-h-screen">
      <div className="container max-w-2xl py-10">
        <Link href="/finanzas" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Finanzas
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Registrar gasto</h1>
        <div className="mt-8 rounded-capsule border border-border/70 bg-card p-6 shadow-soft sm:p-8">
          <GastoForm categorias={categorias ?? []} />
        </div>
      </div>
    </main>
  );
}
