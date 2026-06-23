import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ClipboardList, Wrench } from "lucide-react";

import { EstadoCamaraForm } from "@/components/camara/estado-camara-form";
import { IncidenciaForm } from "@/components/camara/incidencia-form";
import { MantenimientoForm } from "@/components/camara/mantenimiento-form";
import {
  CAMARA_ESTADO_LABEL,
  MANTENIMIENTO_TIPO_LABEL,
} from "@/lib/constants/camara";
import { formatFecha, formatRD } from "@/lib/format";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const estadoClase: Record<string, string> = {
  operativa: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
  en_mantenimiento: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40",
  fuera_de_servicio: "bg-destructive/15 text-destructive border-destructive/40",
};

type Mant = {
  id: string;
  fecha: string;
  tipo: string;
  descripcion: string;
  realizado_por: string | null;
  costo: number | null;
  proximo_mantenimiento: string | null;
};
type Inc = {
  id: string;
  fecha: string;
  descripcion: string;
  resolucion: string | null;
};

export default async function CamaraPage() {
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
  const esAdmin = rol === "admin";
  const esClinico = rol === "admin" || rol === "enfermera";

  const { data: camara } = await supabase
    .from("camara")
    .select("nombre, estado, estado_nota, proximo_mantenimiento")
    .limit(1)
    .maybeSingle();

  let mantenimientos: Mant[] = [];
  let incidencias: Inc[] = [];
  if (esClinico) {
    const [{ data: m }, { data: i }] = await Promise.all([
      supabase
        .from("camara_mantenimientos")
        .select("id, fecha, tipo, descripcion, realizado_por, costo, proximo_mantenimiento")
        .order("fecha", { ascending: false }),
      supabase
        .from("camara_incidencias")
        .select("id, fecha, descripcion, resolucion")
        .order("fecha", { ascending: false }),
    ]);
    mantenimientos = (m ?? []) as Mant[];
    incidencias = (i ?? []) as Inc[];
  }

  const estado = camara?.estado ?? "operativa";

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Panel
          </Link>
        </div>
      </header>

      <div className="container max-w-3xl py-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {camara?.nombre ?? "Cámara Hiperbárica"}
        </h1>

        {/* Estado actual */}
        <div className={`mt-6 rounded-capsule border p-6 ${estadoClase[estado] ?? ""}`}>
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">
            Estado actual
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {CAMARA_ESTADO_LABEL[estado] ?? estado}
          </p>
          {camara?.estado_nota && (
            <p className="mt-1 text-sm opacity-90">{camara.estado_nota}</p>
          )}
          {camara?.proximo_mantenimiento && (
            <p className="mt-3 text-sm font-medium">
              Próximo mantenimiento: {formatFecha(camara.proximo_mantenimiento)}
            </p>
          )}
        </div>

        {/* Cambiar estado (solo admin) */}
        {esAdmin && (
          <section className="mt-6 rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Cambiar estado
            </h2>
            <EstadoCamaraForm
              estado={estado}
              estadoNota={camara?.estado_nota ?? null}
              proximoMantenimiento={camara?.proximo_mantenimiento ?? null}
            />
          </section>
        )}

        {!esClinico && (
          <p className="mt-6 text-sm text-muted-foreground">
            Para la gestión del mantenimiento, contacta al administrador.
          </p>
        )}

        {/* Mantenimiento (clínico ve; admin registra) */}
        {esClinico && (
          <section className="mt-6 rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Wrench className="h-4 w-4" />
              Bitácora de mantenimiento ({mantenimientos.length})
            </h2>

            {esAdmin && (
              <div className="mb-6 rounded-2xl bg-secondary/40 p-4">
                <MantenimientoForm />
              </div>
            )}

            {mantenimientos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay mantenimientos registrados.</p>
            ) : (
              <ul className="space-y-3">
                {mantenimientos.map((m) => (
                  <li key={m.id} className="rounded-2xl border border-border/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{formatFecha(m.fecha)}</span>
                      <span className="inline-flex items-center rounded-pill bg-accent px-2.5 py-0.5 text-xs font-medium text-primary">
                        {MANTENIMIENTO_TIPO_LABEL[m.tipo] ?? m.tipo}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{m.descripcion}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {m.realizado_por && <span>Por: {m.realizado_por}</span>}
                      {m.costo != null && <span>Costo: {formatRD(m.costo)}</span>}
                      {m.proximo_mantenimiento && (
                        <span>Próximo: {formatFecha(m.proximo_mantenimiento)}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Incidencias (clínico ve y registra) */}
        {esClinico && (
          <section className="mt-6 rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
              Incidencias ({incidencias.length})
            </h2>

            <div className="mb-6 rounded-2xl bg-secondary/40 p-4">
              <IncidenciaForm />
            </div>

            {incidencias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin incidencias registradas.</p>
            ) : (
              <ul className="space-y-3">
                {incidencias.map((i) => (
                  <li key={i.id} className="rounded-2xl border border-border/60 p-4">
                    <span className="text-sm font-semibold">{formatFecha(i.fecha)}</span>
                    <p className="mt-2 text-sm">{i.descripcion}</p>
                    {i.resolucion ? (
                      <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
                        Resuelto: {i.resolucion}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                        Pendiente de resolución
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Preparado para el futuro (no activo) */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Las alertas automáticas por tiempo/uso se activarán cuando se confirme la
          frecuencia de mantenimiento con el técnico.
        </p>
      </div>
    </main>
  );
}
