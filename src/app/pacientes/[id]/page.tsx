import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Stethoscope, Wind } from "lucide-react";

import { cambiarEstadoPaciente } from "@/app/pacientes/[id]/actions";
import { cancelarSesion } from "@/app/pacientes/[id]/sesiones/nueva/actions";
import { PortalEnlace } from "@/components/portal/portal-enlace";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CONTRAINDICACIONES_RELATIVAS } from "@/lib/constants/evaluacion";
import { formatFecha, formatHoraRD } from "@/lib/format";
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
  searchParams: {
    actualizado?: string;
    estado?: string;
    error?: string;
    sesion?: string;
    cancel?: string;
  };
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
  const esClinico = perfil?.role === "admin" || perfil?.role === "enfermera";

  // Alertas clínicas (contraindicaciones de la última evaluación) — solo clínicos.
  let ciAbsoluta = false;
  let ciRelativas: string[] = [];
  if (esClinico) {
    const { data: ev } = await supabase
      .from("evaluaciones_hbo")
      .select("contraindicaciones")
      .eq("paciente_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const c = (ev?.contraindicaciones ?? {}) as Record<string, unknown>;
    ciAbsoluta = Boolean(c.neumotorax_no_tratado);
    ciRelativas = CONTRAINDICACIONES_RELATIVAS.filter((o) => c[o.key]).map(
      (o) => o.label,
    );
    if (c.otros) ciRelativas.push(String(c.otros));
  }

  // Historial de sesiones (solo personal clínico).
  type SesionRow = {
    id: string;
    fecha: string;
    numero_sesion: number | null;
    total_sesiones: number | null;
    spo2_antes: number | null;
    spo2_despues: number | null;
    presion_ata: number | null;
    duracion_min: number | null;
    incidencias: string | null;
  };
  let sesiones: SesionRow[] = [];
  // Material consumido por sesión: sesion_id -> ["Mascarilla ×1", ...]
  const materialPorSesion = new Map<string, string[]>();
  if (esClinico) {
    const { data } = await supabase
      .from("sesiones")
      .select(
        "id, fecha, numero_sesion, total_sesiones, spo2_antes, spo2_despues, presion_ata, duracion_min, incidencias",
      )
      .eq("paciente_id", params.id)
      .order("fecha", { ascending: false });
    sesiones = (data ?? []) as SesionRow[];

    if (sesiones.length > 0) {
      const { data: movs } = await supabase
        .from("insumo_movimientos")
        .select("sesion_id, cantidad, insumo:insumos(nombre, unidad)")
        .in("sesion_id", sesiones.map((s) => s.id));
      for (const m of movs ?? []) {
        const sid = (m as { sesion_id: string | null }).sesion_id;
        if (!sid) continue;
        const rel = (m as { insumo: { nombre: string; unidad: string } | { nombre: string; unidad: string }[] | null }).insumo;
        const ins = Array.isArray(rel) ? rel[0] : rel;
        if (!ins) continue;
        const txt = `${ins.nombre} ×${Number((m as { cantidad: number }).cantidad)}`;
        const arr = materialPorSesion.get(sid) ?? [];
        arr.push(txt);
        materialPorSesion.set(sid, arr);
      }
    }
  }

  // Enlace activo del portal del paciente (lo gestiona cualquier personal).
  const { data: enlacePortal } = await supabase
    .from("portal_enlaces")
    .select("ultimo_acceso")
    .eq("paciente_id", params.id)
    .eq("activo", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen">
      <div className="container max-w-4xl py-10">
        <Link
          href="/pacientes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Pacientes
        </Link>

        {/* Zona de alertas clínicas (contraindicaciones) — solo personal clínico */}
        {esClinico && (ciAbsoluta || ciRelativas.length > 0) && (
          <div className="mt-6 space-y-3">
            {ciAbsoluta && (
              <div
                role="alert"
                className="rounded-2xl border-2 border-destructive bg-destructive/15 px-4 py-3 text-sm font-semibold text-destructive"
              >
                ⚠️ CONTRAINDICACIÓN ABSOLUTA: Neumotórax no tratado — la terapia
                hiperbárica está contraindicada.
              </div>
            )}
            {ciRelativas.length > 0 && (
              <div
                role="alert"
                className="rounded-2xl border border-amber-500/50 bg-amber-500/15 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-400"
              >
                ⚠️ Contraindicaciones relativas: {ciRelativas.join(", ")}.
                Evaluar riesgo/beneficio.
              </div>
            )}
          </div>
        )}

        {/* Avisos */}
        {searchParams.actualizado === "1" && (
          <div className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ Cambios guardados.
          </div>
        )}
        {searchParams.sesion === "1" && (
          <div className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ Sesión registrada.
          </div>
        )}
        {searchParams.cancel === "1" && (
          <div className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ Sesión cancelada. El material consumido se devolvió al inventario.
          </div>
        )}
        {searchParams.cancel === "error" && (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            No se pudo cancelar la sesión. Solo un administrador puede hacerlo.
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

          <div className="flex flex-wrap items-center gap-3">
            {esClinico && (
              <Button asChild variant="outline">
                <Link href={`/pacientes/${paciente.id}/evaluacion`}>
                  <Stethoscope className="h-4 w-4" />
                  Evaluación HBO
                </Link>
              </Button>
            )}
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

        {/* Historial de sesiones (solo personal clínico) */}
        {esClinico && (
          <div className="mt-5 rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Wind className="h-4 w-4" />
                Historial de sesiones ({sesiones.length})
              </h2>
              <Button asChild variant="vital" size="sm">
                <Link href={`/pacientes/${paciente.id}/sesiones/nueva`}>
                  <Plus className="h-4 w-4" />
                  Registrar sesión
                </Link>
              </Button>
            </div>

            {sesiones.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Aún no hay sesiones registradas.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Fecha</th>
                      <th className="px-3 py-2 font-medium">Sesión</th>
                      <th className="px-3 py-2 font-medium">SpO2 (antes→después)</th>
                      <th className="px-3 py-2 font-medium">ATA</th>
                      <th className="px-3 py-2 font-medium">Dur.</th>
                      <th className="px-3 py-2 font-medium">Material</th>
                      <th className="px-3 py-2 font-medium">Incidencia</th>
                      {esAdmin && <th className="px-3 py-2 font-medium" />}
                    </tr>
                  </thead>
                  <tbody>
                    {sesiones.map((s) => {
                      const material = materialPorSesion.get(s.id) ?? [];
                      return (
                        <tr key={s.id} className="border-b border-border/40 last:border-0">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {formatFecha(s.fecha)} {formatHoraRD(s.fecha)}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {s.numero_sesion ?? "—"}
                            {s.total_sesiones ? ` de ${s.total_sesiones}` : ""}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {s.spo2_antes ?? "—"} → {s.spo2_despues ?? "—"}
                          </td>
                          <td className="px-3 py-2 tabular-nums">{s.presion_ata ?? "—"}</td>
                          <td className="px-3 py-2 tabular-nums">
                            {s.duracion_min ? `${s.duracion_min}m` : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {material.length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span className="text-xs">{material.join(", ")}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {s.incidencias ? (
                              <span className="text-destructive">Sí</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          {esAdmin && (
                            <td className="px-3 py-2 text-right">
                              <ConfirmDialog
                                triggerLabel="Cancelar"
                                triggerVariant="ghost"
                                title="¿Cancelar esta sesión?"
                                description={
                                  material.length > 0
                                    ? `Se eliminará la sesión y se devolverá al inventario: ${material.join(", ")}.`
                                    : "Se eliminará el registro de esta sesión. Esta acción no se puede deshacer."
                                }
                                confirmLabel="Sí, cancelar sesión"
                                action={cancelarSesion.bind(null, s.id, params.id)}
                              />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Portal del paciente (acceso por enlace seguro) */}
        <div className="mt-5">
          <PortalEnlace
            pacienteId={paciente.id}
            pacienteNombre={paciente.nombre_completo}
            telefono={paciente.telefono ?? null}
            tieneEnlace={Boolean(enlacePortal)}
            ultimoAcceso={enlacePortal?.ultimo_acceso ?? null}
          />
        </div>
      </div>
    </main>
  );
}
