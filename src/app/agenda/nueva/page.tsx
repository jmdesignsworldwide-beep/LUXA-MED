import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CitaForm } from "@/components/citas/cita-form";
import { hoyRD } from "@/lib/format";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NuevaCitaPage({
  searchParams,
}: {
  searchParams: { fecha?: string };
}) {
  if (!getSupabaseServerConfig().configured) redirect("/login");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pacientes } = await supabase
    .from("pacientes")
    .select("id, nombre_completo, cedula")
    .eq("activo", true)
    .order("nombre_completo");

  return (
    <main className="min-h-screen">
      <div className="container max-w-2xl py-10">
        <Link
          href="/agenda"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Agenda
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          Agendar cita
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cámara única: si el horario está ocupado, el sistema no permite el
          solape.
        </p>

        {/*
          PREPARADO (siguiente pieza, NO construir aún): alertas inteligentes al
          agendar — avisar si el paciente tiene contraindicación ABSOLUTA o si la
          cámara está en mantenimiento / fuera de servicio en esa fecha.
        */}
        <div className="mt-8 rounded-capsule border border-border/70 bg-card p-6 shadow-soft sm:p-8">
          <CitaForm
            pacientes={pacientes ?? []}
            defaultFecha={searchParams.fecha ?? hoyRD()}
          />
        </div>
      </div>
    </main>
  );
}
