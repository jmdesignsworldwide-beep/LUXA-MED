import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { actualizarPaciente } from "@/app/pacientes/[id]/actions";
import { PacienteForm } from "@/components/pacientes/paciente-form";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditarPacientePage({
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

  const { data: p } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!p) redirect("/pacientes");

  const defaults = {
    nombre_completo: p.nombre_completo ?? "",
    cedula: p.cedula ?? "",
    fecha_nacimiento: p.fecha_nacimiento ?? "",
    sexo: p.sexo ?? "",
    telefono: p.telefono ?? "",
    email: p.email ?? "",
    direccion: p.direccion ?? "",
    tipo_sangre: p.tipo_sangre ?? "",
    alergias: p.alergias ?? "",
    contacto_emergencia_nombre: p.contacto_emergencia_nombre ?? "",
    contacto_emergencia_telefono: p.contacto_emergencia_telefono ?? "",
    ars: p.ars ?? "",
    ars_numero_afiliado: p.ars_numero_afiliado ?? "",
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <div className="container max-w-3xl py-10">
        <Link
          href={`/pacientes/${p.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Ficha del paciente
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          Editar paciente
        </h1>

        <div className="mt-8 rounded-capsule border border-border/70 bg-card p-6 shadow-soft sm:p-8">
          <PacienteForm
            action={actualizarPaciente.bind(null, p.id)}
            defaults={defaults}
            submitLabel="Guardar cambios"
          />
        </div>
      </div>
    </main>
  );
}
