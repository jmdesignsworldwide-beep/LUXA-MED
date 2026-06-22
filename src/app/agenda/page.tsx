import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DIAS_SEMANA,
  ESTADO_CITA_LABEL,
  RD_OFFSET,
} from "@/lib/constants/citas";
import { formatFecha, formatHoraRD, hoyRD } from "@/lib/format";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function shiftFecha(fecha: string, days: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const estadoClase: Record<string, string> = {
  programada: "bg-brand-cyan/15 text-primary",
  completada: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelada: "bg-muted text-muted-foreground",
  no_asistio: "bg-destructive/15 text-destructive",
};

type CitaRow = {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  pacientes: { nombre_completo: string; cedula: string | null } | null;
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { fecha?: string; creada?: string };
}) {
  if (!getSupabaseServerConfig().configured) redirect("/login");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.fecha ?? "")
    ? (searchParams.fecha as string)
    : hoyRD();
  const dow = new Date(`${fecha}T00:00:00Z`).getUTCDay();

  const { data } = await supabase
    .from("citas")
    .select("id, inicio, fin, estado, pacientes(nombre_completo, cedula)")
    .gte("inicio", `${fecha}T00:00:00${RD_OFFSET}`)
    .lte("inicio", `${fecha}T23:59:59${RD_OFFSET}`)
    .order("inicio", { ascending: true });

  const citas = (data ?? []) as unknown as CitaRow[];

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Panel
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="container py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Agenda
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {DIAS_SEMANA[dow]} {formatFecha(fecha)} · cámara única
            </p>
          </div>
          <Button asChild variant="vital">
            <Link href={`/agenda/nueva?fecha=${fecha}`}>
              <Plus className="h-4 w-4" />
              Nueva cita
            </Link>
          </Button>
        </div>

        {searchParams.creada === "1" && (
          <div className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ Cita agendada correctamente.
          </div>
        )}

        {/* Navegación de día */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href={`/agenda?fecha=${shiftFecha(fecha, -1)}`}>
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Link>
          </Button>
          <form method="get" className="flex items-center gap-2">
            <input
              type="date"
              name="fecha"
              defaultValue={fecha}
              className="h-9 rounded-pill border border-input bg-background px-4 text-sm"
            />
            <Button type="submit" variant="outline" size="sm">
              Ir
            </Button>
          </form>
          <Button asChild variant="outline" size="sm">
            <Link href={`/agenda?fecha=${shiftFecha(fecha, 1)}`}>
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Lista de citas del día */}
        <div className="mt-6 space-y-3">
          {citas.length === 0 ? (
            <div className="rounded-capsule border border-border/70 bg-card p-10 text-center text-muted-foreground shadow-soft">
              No hay citas para este día.
            </div>
          ) : (
            citas.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-capsule border border-border/70 bg-card px-5 py-4 shadow-soft"
              >
                <div className="flex items-center gap-4">
                  <div className="w-32 shrink-0 text-sm font-semibold tabular-nums">
                    {formatHoraRD(c.inicio)}
                    <span className="text-muted-foreground">
                      {" "}
                      – {formatHoraRD(c.fin)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">
                      {c.pacientes?.nombre_completo ?? "Paciente"}
                    </p>
                    {c.pacientes?.cedula && (
                      <p className="text-xs text-muted-foreground">
                        {c.pacientes.cedula}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${
                    estadoClase[c.estado] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {ESTADO_CITA_LABEL[c.estado] ?? c.estado}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
