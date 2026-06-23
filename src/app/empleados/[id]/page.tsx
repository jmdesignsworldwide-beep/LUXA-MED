import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download, Lock, Pencil, Plus, Wallet } from "lucide-react";

import { cambiarEstadoEmpleado } from "@/app/empleados/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { METODO_PAGO_LABEL } from "@/lib/constants/nominas";
import { PUESTO_LABEL } from "@/lib/constants/empleados";
import { formatFecha, formatRD } from "@/lib/format";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function Dato({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

function Seccion({
  titulo,
  privado,
  children,
}: {
  titulo: string;
  privado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-capsule border p-6 shadow-soft ${
        privado ? "border-amber-500/30 bg-amber-500/5" : "border-border/70 bg-card"
      }`}
    >
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {privado && <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
        {titulo}
      </h2>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

export default async function FichaEmpleadoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { creado?: string; actualizado?: string; estado?: string; error?: string };
}) {
  if (!getSupabaseServerConfig().configured) redirect("/login");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: perfil }, { data: empleado }] = await Promise.all([
    supabase.from("user_profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("empleados").select("*").eq("id", params.id).maybeSingle(),
  ]);
  if (!empleado) redirect("/empleados");
  const esAdmin = perfil?.role === "admin";

  // Datos privados: SOLO admin (RLS lo garantiza; igual lo pedimos condicionado).
  let privado:
    | {
        cedula: string | null;
        salario: number | null;
        banco: string | null;
        cuenta_banco: string | null;
        direccion: string | null;
        contacto_emergencia_nombre: string | null;
        contacto_emergencia_telefono: string | null;
        notas_rrhh: string | null;
      }
    | null = null;
  if (esAdmin) {
    const { data } = await supabase
      .from("empleados_privado")
      .select(
        "cedula, salario, banco, cuenta_banco, direccion, contacto_emergencia_nombre, contacto_emergencia_telefono, notas_rrhh",
      )
      .eq("empleado_id", params.id)
      .maybeSingle();
    privado = data ?? null;
  }

  // Cuenta de login vinculada (si la hay).
  let cuenta: { nombre_completo: string; role: string } | null = null;
  if (empleado.user_id) {
    const { data } = await supabase
      .from("user_profiles")
      .select("nombre_completo, role")
      .eq("id", empleado.user_id)
      .maybeSingle();
    cuenta = data ?? null;
  }

  // Historial de pagos de nómina (solo admin).
  let pagos: { id: string; monto: number; fecha_pago: string; periodo: string; metodo: string }[] = [];
  let totalPagado = 0;
  if (esAdmin) {
    const { data } = await supabase
      .from("nominas")
      .select("id, monto, fecha_pago, periodo, metodo")
      .eq("empleado_id", params.id)
      .order("fecha_pago", { ascending: false });
    pagos = (data ?? []) as typeof pagos;
    totalPagado = pagos.reduce((a, p) => a + Number(p.monto), 0);
  }

  return (
    <main className="min-h-screen">
      <div className="container max-w-4xl py-10">
        <Link
          href="/empleados"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Empleados
        </Link>

        {searchParams.actualizado === "1" && (
          <div className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ Cambios guardados.
          </div>
        )}
        {searchParams.estado && (
          <div className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ Empleado {searchParams.estado === "activado" ? "reactivado" : "desactivado"}.
          </div>
        )}
        {searchParams.error === "estado" && (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            No se pudo cambiar el estado. Solo un administrador puede hacerlo.
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {empleado.nombre_completo}
              </h1>
              {empleado.activo ? (
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
              {empleado.puesto ? PUESTO_LABEL[empleado.puesto] ?? empleado.puesto : "Sin puesto"}
            </p>
          </div>

          {esAdmin && (
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link href={`/empleados/${empleado.id}/editar`}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Link>
              </Button>
              {empleado.activo ? (
                <ConfirmDialog
                  triggerLabel="Desactivar"
                  triggerVariant="outline"
                  title="¿Desactivar empleado?"
                  description="El empleado pasará a inactivo. No se borra: se conserva todo su historial y se puede reactivar después."
                  confirmLabel="Sí, desactivar"
                  confirmVariant="destructive"
                  action={cambiarEstadoEmpleado.bind(null, empleado.id, false)}
                />
              ) : (
                <ConfirmDialog
                  triggerLabel="Reactivar"
                  triggerVariant="outline"
                  title="¿Reactivar empleado?"
                  description="El empleado volverá a estar activo."
                  confirmLabel="Sí, reactivar"
                  confirmVariant="default"
                  action={cambiarEstadoEmpleado.bind(null, empleado.id, true)}
                />
              )}
            </div>
          )}
        </div>

        <div className="mt-8 space-y-5">
          <Seccion titulo="Datos generales">
            <Dato label="Nombre completo" value={empleado.nombre_completo} />
            <Dato
              label="Puesto"
              value={empleado.puesto ? PUESTO_LABEL[empleado.puesto] ?? empleado.puesto : null}
            />
            <Dato label="Teléfono" value={empleado.telefono} />
            <Dato label="Correo" value={empleado.email} />
            <Dato label="Fecha de ingreso" value={formatFecha(empleado.fecha_ingreso)} />
            <Dato
              label="Cuenta de sistema"
              value={cuenta ? `${cuenta.nombre_completo} · ${cuenta.role}` : "Sin cuenta"}
            />
          </Seccion>

          {esAdmin ? (
            <Seccion titulo="Datos privados (RRHH)" privado>
              <Dato label="Cédula" value={privado?.cedula} />
              <Dato
                label="Salario"
                value={privado?.salario != null ? formatRD(privado.salario) : null}
              />
              <Dato label="Banco" value={privado?.banco} />
              <Dato label="Cuenta bancaria" value={privado?.cuenta_banco} />
              <Dato label="Dirección" value={privado?.direccion} />
              <Dato label="Contacto de emergencia" value={privado?.contacto_emergencia_nombre} />
              <Dato label="Teléfono de emergencia" value={privado?.contacto_emergencia_telefono} />
              <Dato label="Notas de RRHH" value={privado?.notas_rrhh} />
            </Seccion>
          ) : (
            <div className="rounded-capsule border border-border/70 bg-card p-6 text-sm text-muted-foreground shadow-soft">
              <Lock className="mb-2 h-4 w-4" />
              Los datos privados (salario, cédula, banco) solo los puede ver el
              administrador.
            </div>
          )}

          {esAdmin && (
            <div className="rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  Pagos de nómina ({pagos.length}) · Total {formatRD(totalPagado)}
                </h2>
                <Button asChild variant="vital" size="sm">
                  <Link href={`/nominas/nuevo?empleado=${empleado.id}`}>
                    <Plus className="h-4 w-4" />
                    Registrar pago
                  </Link>
                </Button>
              </div>

              {pagos.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Aún no hay pagos registrados.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Fecha</th>
                        <th className="px-3 py-2 font-medium">Período</th>
                        <th className="px-3 py-2 font-medium">Método</th>
                        <th className="px-3 py-2 font-medium">Monto</th>
                        <th className="px-3 py-2 font-medium">Recibo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagos.map((p) => (
                        <tr key={p.id} className="border-b border-border/40 last:border-0">
                          <td className="px-3 py-2 whitespace-nowrap">{formatFecha(p.fecha_pago)}</td>
                          <td className="px-3 py-2 text-muted-foreground">{p.periodo}</td>
                          <td className="px-3 py-2 text-muted-foreground">{METODO_PAGO_LABEL[p.metodo] ?? p.metodo}</td>
                          <td className="px-3 py-2 font-semibold tabular-nums">{formatRD(Number(p.monto))}</td>
                          <td className="px-3 py-2">
                            <a href={`/nominas/${p.id}/recibo`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                              <Download className="h-3.5 w-3.5" /> PDF
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
