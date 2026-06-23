import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  NominaForm,
  type EmpleadoOpcion,
} from "@/components/nominas/nomina-form";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NuevoPagoPage({
  searchParams,
}: {
  searchParams: { empleado?: string };
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

  const [{ data: empleados }, { data: privados }] = await Promise.all([
    supabase
      .from("empleados")
      .select("id, nombre_completo")
      .eq("activo", true)
      .order("nombre_completo"),
    supabase.from("empleados_privado").select("empleado_id, salario"),
  ]);

  const salarioDe = new Map<string, number | null>();
  (privados ?? []).forEach((p) => salarioDe.set(p.empleado_id, p.salario));

  const opciones: EmpleadoOpcion[] = (empleados ?? []).map((e) => ({
    id: e.id,
    nombre: e.nombre_completo,
    salario: salarioDe.get(e.id) ?? null,
  }));

  return (
    <main className="min-h-screen">
      <div className="container max-w-2xl py-10">
        <Link
          href="/nominas"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Nómina
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          Registrar pago
        </h1>

        <div className="mt-8 rounded-capsule border border-border/70 bg-card p-6 shadow-soft sm:p-8">
          {opciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay empleados activos. Registra primero un empleado en{" "}
              <Link href="/empleados" className="text-primary hover:underline">
                Empleados
              </Link>
              .
            </p>
          ) : (
            <NominaForm
              empleados={opciones}
              empleadoPreseleccionado={searchParams.empleado}
            />
          )}
        </div>
      </div>
    </main>
  );
}
