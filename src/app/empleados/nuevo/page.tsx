import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { crearEmpleado } from "@/app/empleados/actions";
import { EmpleadoForm, type Cuenta } from "@/components/empleados/empleado-form";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NuevoEmpleadoPage() {
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
  if (perfil?.role !== "admin") redirect("/empleados");

  // Cuentas de login que aún no están vinculadas a un empleado.
  const [{ data: usuarios }, { data: vinculados }] = await Promise.all([
    supabase.from("user_profiles").select("id, nombre_completo, role"),
    supabase.from("empleados").select("user_id"),
  ]);
  const usados = new Set(
    (vinculados ?? []).map((v) => v.user_id).filter(Boolean) as string[],
  );
  const cuentas = ((usuarios ?? []) as Cuenta[]).filter((u) => !usados.has(u.id));

  return (
    <main className="min-h-screen">
      <div className="container max-w-3xl py-10">
        <Link
          href="/empleados"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Empleados
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          Nuevo empleado
        </h1>

        <div className="mt-8 rounded-capsule border border-border/70 bg-card p-6 shadow-soft sm:p-8">
          <EmpleadoForm action={crearEmpleado} cuentas={cuentas} />
        </div>
      </div>
    </main>
  );
}
