import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { guardarEvaluacion } from "@/app/pacientes/[id]/evaluacion/actions";
import { EvaluacionForm } from "@/components/evaluacion/evaluacion-form";
import { FirmaConsentimiento } from "@/components/evaluacion/firma-consentimiento";
import { formatFecha } from "@/lib/format";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function calcEdad(fn?: string | null): string {
  if (!fn) return "—";
  const b = new Date(`${fn}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age >= 0 ? `${age} años` : "—";
}

export default async function EvaluacionPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { guardado?: string; firmado?: string };
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

  // Solo personal clínico (admin/enfermera) ve evaluaciones. Recepción no.
  const rol = perfil?.role;
  if (rol !== "admin" && rol !== "enfermera") redirect("/pacientes");
  const canEdit = rol === "admin";

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!paciente) redirect("/pacientes");

  const { data: evaluacion } = await supabase
    .from("evaluaciones_hbo")
    .select("*")
    .eq("paciente_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let firma = null;
  if (evaluacion) {
    const { data } = await supabase
      .from("firmas_consentimiento")
      .select("tipo_firma, firma_texto, firmado_en, pdf_hash, paciente_nombre")
      .eq("evaluacion_id", evaluacion.id)
      .maybeSingle();
    firma = data ?? null;
  }

  const identidad = {
    nombre_completo: paciente.nombre_completo,
    cedula: paciente.cedula,
    fecha_nacimiento: formatFecha(paciente.fecha_nacimiento),
    edad: calcEdad(paciente.fecha_nacimiento),
    sexo: paciente.sexo,
    direccion: paciente.direccion,
    telefono: paciente.telefono,
    email: paciente.email,
    contacto_emergencia_nombre: paciente.contacto_emergencia_nombre,
    contacto_emergencia_telefono: paciente.contacto_emergencia_telefono,
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <div className="container max-w-4xl py-10">
        <Link
          href={`/pacientes/${params.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Ficha del paciente
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          Evaluación para Terapia Hiperbárica
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {paciente.nombre_completo}
        </p>

        {searchParams.guardado === "1" && (
          <div className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ Evaluación guardada.
          </div>
        )}
        {searchParams.firmado === "1" && (
          <div className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ Consentimiento firmado y documento generado.
          </div>
        )}

        <div className="mt-6">
          <EvaluacionForm
            action={guardarEvaluacion.bind(null, params.id)}
            pacienteId={params.id}
            identidad={identidad}
            evaluacion={evaluacion}
            canEdit={canEdit}
          />
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">
            Consentimiento informado — Firma
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {firma
              ? "Documento firmado (inmutable)."
              : "Firma del paciente (con el dedo o tipográfica) para cerrar el documento."}
          </p>
          <div className="mt-4">
            <FirmaConsentimiento
              evaluacionId={evaluacion?.id ?? null}
              pacienteId={params.id}
              firma={firma}
              canSign={canEdit}
              evaluacionExiste={Boolean(evaluacion)}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
