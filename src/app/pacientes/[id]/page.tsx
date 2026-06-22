import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { cambiarEstadoPaciente } from "@/app/pacientes/[id]/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatFecha } from "@/lib/format";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function Dato({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h2>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

export default async function FichaPacientePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { actualizado?: string; estado?: string; error?: string };
}) {
  if (!getSupabaseServerConfig().configured) redirect("/login");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: paciente }, { data: perfil }] = await Promise.all([
    supabase.from("pacientes").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("user_profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);

  if (!paciente) redirect("/pacientes");
  const esAdmin = perfil?.role === "admin";

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <div className="container max-w-4xl py-10">
        <Link
          href="/pacientes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Pacientes
        </Link>

        {/* Avisos */}
        {searchParams.actualizado === "1" && (
          <div className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ Cambios guardados.
          </div>
        )}
        {searchParams.estado && (
          <div className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ Paciente {searchParams.estado === "activado" ? "reactivado" : "desactivado"}.
          </div>
        )}
        {searchParams.error === "estado" && (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            No se pudo cambiar el estado. Solo un administrador puede hacerlo.
          </div>
        )}

        {/* Encabezado */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {paciente.nombre_completo}
              </h1>
              {paciente.activo ? (
                <span className="inline-flex items-center rounded-pill bg-brand-cyan/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Activo
                </span>
              ) : (
                <span className="inline-flex items-center rounded-pill bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  Inactivo
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Cédula {paciente.cedula ?? "—"} · Registrado el{" "}
              {formatFecha(paciente.created_at)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild>
              <Link href={`/pacientes/${paciente.id}/editar`}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </Button>

            {esAdmin &&
              (paciente.activo ? (
                <ConfirmDialog
                  triggerLabel="Desactivar"
                  triggerVariant="outline"
                  title="¿Desactivar paciente?"
                  description="El paciente pasará a inactivo. No se borra: se conserva todo su historial y se puede reactivar después."
                  confirmLabel="Sí, desactivar"
                  confirmVariant="destructive"
                  action={cambiarEstadoPaciente.bind(null, paciente.id, false)}
                />
              ) : (
                <ConfirmDialog
                  triggerLabel="Reactivar"
                  triggerVariant="outline"
                  title="¿Reactivar paciente?"
                  description="El paciente volverá a estar activo."
                  confirmLabel="Sí, reactivar"
                  confirmVariant="default"
                  action={cambiarEstadoPaciente.bind(null, paciente.id, true)}
                />
              ))}
          </div>
        </div>

        {/* Datos */}
        <div className="mt-8 space-y-5">
          <Seccion titulo="Identidad">
            <Dato label="Nombre completo" value={paciente.nombre_completo} />
            <Dato label="Cédula" value={paciente.cedula} />
            <Dato
              label="Fecha de nacimiento"
              value={formatFecha(paciente.fecha_nacimiento)}
            />
            <Dato
              label="Sexo"
              value={
                paciente.sexo === "M"
                  ? "Masculino"
                  : paciente.sexo === "F"
                    ? "Femenino"
                    : paciente.sexo
              }
            />
          </Seccion>

          <Seccion titulo="Contacto">
            <Dato label="Teléfono" value={paciente.telefono} />
            <Dato label="Correo" value={paciente.email} />
            <Dato label="Dirección" value={paciente.direccion} />
          </Seccion>

          <Seccion titulo="Médico básico">
            <Dato label="Tipo de sangre" value={paciente.tipo_sangre} />
            <Dato label="Alergias" value={paciente.alergias} />
            <Dato
              label="Contacto de emergencia"
              value={paciente.contacto_emergencia_nombre}
            />
            <Dato
              label="Teléfono de emergencia"
              value={paciente.contacto_emergencia_telefono}
            />
          </Seccion>

          <Seccion titulo="Seguro">
            <Dato label="ARS" value={paciente.ars} />
            <Dato label="Número de afiliado" value={paciente.ars_numero_afiliado} />
          </Seccion>
        </div>
      </div>
    </main>
  );
}
