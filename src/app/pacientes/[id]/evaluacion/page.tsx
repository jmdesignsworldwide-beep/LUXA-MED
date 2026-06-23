import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download, Lock } from "lucide-react";

import {
  crearAnexo,
  guardarBorrador,
  sellarEvaluacion,
} from "@/app/pacientes/[id]/evaluacion/actions";
import { EvaluacionForm } from "@/components/evaluacion/evaluacion-form";
import { Button } from "@/components/ui/button";
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

const ERRORES: Record<string, string> = {
  campos: "Revisa los campos: hay algún valor inválido.",
  guardar: "No se pudo guardar el borrador.",
  firma: "Falta la firma del paciente y/o la aceptación del consentimiento.",
  sellar: "No se pudo sellar la evaluación.",
  ya_firmada: "Esta evaluación ya estaba firmada.",
  anexo: "No se pudo crear el anexo.",
};

export default async function EvaluacionPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { guardado?: string; firmado?: string; anexo?: string; error?: string };
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
  const esAdmin = rol === "admin";

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

  const sellada = evaluacion?.estado === "finalizada";

  let firma = null;
  if (sellada && evaluacion) {
    const { data } = await supabase
      .from("firmas_consentimiento")
      .select("tipo_firma, firmado_en, pdf_hash, paciente_nombre")
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

  const evalId = evaluacion?.id ?? "";
  const fechaFirma = firma
    ? new Intl.DateTimeFormat("es-DO", {
        timeZone: "America/Santo_Domingo",
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(firma.firmado_en))
    : "";

  return (
    <main className="min-h-screen">
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
        <p className="mt-1 text-sm text-muted-foreground">{paciente.nombre_completo}</p>

        {searchParams.guardado === "1" && (
          <div className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ Borrador guardado.
          </div>
        )}
        {searchParams.firmado === "1" && (
          <div className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ Consentimiento firmado y evaluación sellada.
          </div>
        )}
        {searchParams.anexo === "1" && (
          <div className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ Nuevo anexo creado (borrador).
          </div>
        )}
        {searchParams.error && (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {ERRORES[searchParams.error] ?? "Ocurrió un error."}
          </div>
        )}

        {/* Estado sellado: documento inmutable + descarga + anexo */}
        {sellada && (
          <div className="mt-6 rounded-capsule border-2 border-primary/30 bg-primary/5 p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Lock className="h-4 w-4" />
              Evaluación firmada y sellada — documento inmutable
            </div>
            {firma && (
              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Firmado por</dt>
                  <dd className="font-medium">{firma.paciente_nombre}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Fecha y hora</dt>
                  <dd className="font-medium">{fechaFirma}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Hash SHA-256 (integridad)</dt>
                  <dd className="break-all font-mono text-xs">{firma.pdf_hash}</dd>
                </div>
              </dl>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <a href={`/pacientes/${params.id}/consentimiento`} target="_blank" rel="noopener">
                  <Download className="h-4 w-4" />
                  Ver / descargar PDF
                </a>
              </Button>
              {esAdmin && (
                <form action={crearAnexo.bind(null, params.id)}>
                  <Button type="submit" variant="outline">
                    Crear nueva evaluación (anexo)
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}

        <div className="mt-6">
          <EvaluacionForm
            draftAction={guardarBorrador.bind(null, params.id, evalId)}
            sealAction={sellarEvaluacion.bind(null, params.id, evalId)}
            pacienteId={params.id}
            identidad={identidad}
            evaluacion={evaluacion}
            canEdit={esAdmin && !sellada}
          />
        </div>
      </div>
    </main>
  );
}
