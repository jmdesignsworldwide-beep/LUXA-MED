import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { actualizarEmpleado } from "@/app/empleados/actions";
import {
  EmpleadoForm,
  type Cuenta,
  type EmpleadoDefaults,
} from "@/components/empleados/empleado-form";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditarEmpleadoPage({
  params,
}: {
  params: { id: string };
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
  if (perfil?.role !== "admin") redirect("/empleados");

  const [{ data: empleado }, { data: privado }, { data: usuarios }, { data: vinculados }] =
    await Promise.all([
      supabase.from("empleados").select("*").eq("id", params.id).maybeSingle(),
      supabase.from("empleados_privado").select("*").eq("empleado_id", params.id).maybeSingle(),
      supabase.from("user_profiles").select("id, nombre_completo, role"),
      supabase.from("empleados").select("user_id"),
    ]);

  if (!empleado) redirect("/empleados");

  // Cuentas libres + la actualmente vinculada a este empleado.
  const usados = new Set(
    (vinculados ?? [])
      .map((v) => v.user_id)
      .filter((id) => id && id !== empleado.user_id) as string[],
  );
  const cuentas = ((usuarios ?? []) as Cuenta[]).filter((u) => !usados.has(u.id));

  const defaults: EmpleadoDefaults = {
    nombre_completo: empleado.nombre_completo ?? "",
    puesto: empleado.puesto ?? "otro",
    telefono: empleado.telefono ?? "",
    email: empleado.email ?? "",
    fecha_ingreso: empleado.fecha_ingreso ?? "",
    user_id: empleado.user_id ?? "",
    cedula: privado?.cedula ?? "",
    salario: privado?.salario != null ? String(privado.salario) : "",
    banco: privado?.banco ?? "",
    cuenta_banco: privado?.cuenta_banco ?? "",
    direccion: privado?.direccion ?? "",
    contacto_emergencia_nombre: privado?.contacto_emergencia_nombre ?? "",
    contacto_emergencia_telefono: privado?.contacto_emergencia_telefono ?? "",
    notas_rrhh: privado?.notas_rrhh ?? "",
  };

  return (
    <main className="min-h-screen">
      <div className="container max-w-3xl py-10">
        <Link
          href={`/empleados/${empleado.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Ficha del empleado
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          Editar empleado
        </h1>

        <div className="mt-8 rounded-capsule border border-border/70 bg-card p-6 shadow-soft sm:p-8">
          <EmpleadoForm
            action={actualizarEmpleado.bind(null, empleado.id)}
            defaults={defaults}
            cuentas={cuentas}
            editar
          />
        </div>
      </div>
    </main>
  );
}
