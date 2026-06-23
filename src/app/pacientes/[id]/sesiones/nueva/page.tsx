import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { SesionForm } from "@/components/sesiones/sesion-form";
import { formatFecha, formatHoraRD, hoyRD } from "@/lib/format";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NuevaSesionPage({
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
  const rol = perfil?.role;
  if (rol !== "admin" && rol !== "enfermera") redirect("/pacientes");

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("nombre_completo")
    .eq("id", params.id)
    .maybeSingle();
  if (!paciente) redirect("/pacientes");

  // Citas PROGRAMADAS del paciente (para vincular), de hoy y próximas.
  const hoy = hoyRD();
  const { data: citasRaw } = await supabase
    .from("citas")
    .select("id, inicio")
    .eq("paciente_id", params.id)
    .eq("estado", "programada")
    .order("inicio", { ascending: true })
    .limit(50);
  const citas = (citasRaw ?? []).map((c) => {
    const fechaRD = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santo_Domingo",
    }).format(new Date(c.inicio));
    const esHoy = fechaRD === hoy;
    return {
      id: c.id,
      label: `${formatFecha(c.inicio)} ${formatHoraRD(c.inicio)}${esHoy ? " · HOY" : ""}`,
      esHoy,
    };
  });
  const defaultCitaId = citas.find((c) => c.esHoy)?.id ?? "";

  // Autollenado desde la evaluación + conteo de sesiones previas
  const { data: evaluacion } = await supabase
    .from("evaluaciones_hbo")
    .select("sesiones_estimadas, presion_ata")
    .eq("paciente_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count } = await supabase
    .from("sesiones")
    .select("id", { count: "exact", head: true })
    .eq("paciente_id", params.id);

  const defaults = {
    numero_sesion: (count ?? 0) + 1,
    total_sesiones: evaluacion?.sesiones_estimadas?.toString() ?? "",
    presion_ata: evaluacion?.presion_ata?.toString() ?? "",
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <div className="container max-w-2xl py-10">
        <Link
          href={`/pacientes/${params.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Ficha del paciente
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          Registrar sesión
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{paciente.nombre_completo}</p>

        <div className="mt-8 rounded-capsule border border-border/70 bg-card p-6 shadow-soft sm:p-8">
          <SesionForm
            pacienteId={params.id}
            citas={citas}
            defaultCitaId={defaultCitaId}
            defaults={defaults}
          />
        </div>
      </div>
    </main>
  );
}
