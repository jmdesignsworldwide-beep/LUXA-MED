import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { cambiarEstadoCita } from "@/app/agenda/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DIAS_SEMANA, ESTADO_CITA_LABEL, RD_OFFSET } from "@/lib/constants/citas";
import { formatFecha, formatHoraRD, hoyRD } from "@/lib/format";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Vista = "dia" | "semana" | "mes" | "proximas";

const estadoClase: Record<string, string> = {
  programada: "bg-brand-cyan/15 text-primary",
  completada: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelada: "bg-muted text-muted-foreground",
  no_asistio: "bg-destructive/15 text-destructive",
};
const estadoPunto: Record<string, string> = {
  programada: "bg-brand-cyan",
  completada: "bg-emerald-500",
  cancelada: "bg-muted-foreground",
  no_asistio: "bg-destructive",
};

type CitaRow = {
  id: string;
  paciente_id: string;
  inicio: string;
  fin: string;
  estado: string;
  pacientes: { nombre_completo: string; cedula: string | null } | null;
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
/** Fecha RD (YYYY-MM-DD) de un instante (evita desfase nocturno UTC). */
function fechaRD(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santo_Domingo",
  }).format(new Date(iso));
}
function shiftFecha(fecha: string, days: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return ymd(d);
}
function lunesDe(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  const desdeLunes = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - desdeLunes);
  return ymd(d);
}
function rangoUTC(desde: string, hasta: string) {
  return {
    gte: `${desde}T00:00:00${RD_OFFSET}`,
    lte: `${hasta}T23:59:59${RD_OFFSET}`,
  };
}
const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const ESTADOS = ["programada", "completada", "cancelada", "no_asistio"];

function dowUTC(fecha: string): number {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay();
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: {
    vista?: string;
    fecha?: string;
    q?: string;
    estado?: string;
    creada?: string;
    actualizada?: string;
    error?: string;
  };
}) {
  if (!getSupabaseServerConfig().configured) redirect("/login");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const vista = (["dia", "semana", "mes", "proximas"].includes(searchParams.vista ?? "")
    ? searchParams.vista
    : "dia") as Vista;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.fecha ?? "")
    ? (searchParams.fecha as string)
    : hoyRD();
  const q = (searchParams.q ?? "").trim();
  const estado = ESTADOS.includes(searchParams.estado ?? "")
    ? (searchParams.estado as string)
    : "";

  const sel = "id, paciente_id, inicio, fin, estado, pacientes(nombre_completo, cedula)";

  // Conserva filtros en los enlaces.
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (estado) p.set("estado", estado);
    Object.entries(extra).forEach(([k, v]) => p.set(k, v));
    return `/agenda?${p.toString()}`;
  };

  // ---- Datos según modo ----
  let citas: CitaRow[] = [];
  let semana: { fecha: string; citas: CitaRow[]; abierto: boolean }[] = [];
  let mesCeldas: { fecha: string; enMes: boolean; n: number }[] = [];
  let horario: Record<number, boolean> = {};

  if (q) {
    // Búsqueda global del paciente (nombre o cédula) — todas sus citas.
    const safe = q.replace(/[%,()]/g, " ").trim();
    const { data: pac } = await supabase
      .from("pacientes")
      .select("id")
      .or(`nombre_completo.ilike.%${safe}%,cedula.ilike.%${safe}%`);
    const ids = (pac ?? []).map((p) => p.id as string);
    if (ids.length > 0) {
      let query = supabase.from("citas").select(sel).in("paciente_id", ids);
      if (estado) query = query.eq("estado", estado);
      const { data } = await query.order("inicio", { ascending: false }).limit(200);
      citas = (data ?? []) as unknown as CitaRow[];
    }
  } else if (vista === "dia") {
    const { gte, lte } = rangoUTC(fecha, fecha);
    let query = supabase.from("citas").select(sel).gte("inicio", gte).lte("inicio", lte);
    if (estado) query = query.eq("estado", estado);
    const { data } = await query.order("inicio", { ascending: true });
    citas = (data ?? []) as unknown as CitaRow[];
  } else if (vista === "proximas") {
    let query = supabase.from("citas").select(sel).gte("inicio", new Date().toISOString());
    if (estado) query = query.eq("estado", estado);
    const { data } = await query.order("inicio", { ascending: true }).limit(100);
    citas = (data ?? []) as unknown as CitaRow[];
  } else if (vista === "semana") {
    const lunes = lunesDe(fecha);
    const domingo = shiftFecha(lunes, 6);
    const { gte, lte } = rangoUTC(lunes, domingo);
    let query = supabase.from("citas").select(sel).gte("inicio", gte).lte("inicio", lte);
    if (estado) query = query.eq("estado", estado);
    const [{ data }, { data: hs }] = await Promise.all([
      query.order("inicio", { ascending: true }),
      supabase.from("horario_operacion").select("dia_semana, abierto"),
    ]);
    (hs ?? []).forEach((h) => (horario[h.dia_semana] = h.abierto));
    const todas = (data ?? []) as unknown as CitaRow[];
    semana = Array.from({ length: 7 }, (_, i) => {
      const f = shiftFecha(lunes, i);
      const dia = dowUTC(f);
      return {
        fecha: f,
        abierto: horario[dia] ?? true,
        citas: todas.filter((c) => fechaRD(c.inicio) === f),
      };
    });
  } else {
    // mes
    const [y, m] = fecha.split("-").map(Number);
    const primero = `${y}-${String(m).padStart(2, "0")}-01`;
    const ultimo = ymd(new Date(Date.UTC(y, m, 0)));
    const { gte, lte } = rangoUTC(primero, ultimo);
    let query = supabase.from("citas").select("inicio, estado").gte("inicio", gte).lte("inicio", lte);
    if (estado) query = query.eq("estado", estado);
    const { data } = await query;
    const conteo: Record<string, number> = {};
    (data ?? []).forEach((c) => {
      const f = fechaRD(c.inicio as string);
      conteo[f] = (conteo[f] ?? 0) + 1;
    });
    const inicioGrid = lunesDe(primero);
    mesCeldas = Array.from({ length: 42 }, (_, i) => {
      const f = shiftFecha(inicioGrid, i);
      return { fecha: f, enMes: f.slice(0, 7) === primero.slice(0, 7), n: conteo[f] ?? 0 };
    });
  }

  const tabs: { v: Vista; label: string }[] = [
    { v: "dia", label: "Día" },
    { v: "semana", label: "Semana" },
    { v: "mes", label: "Mes" },
    { v: "proximas", label: "Próximas" },
  ];

  function CitaLista({ c, conAcciones }: { c: CitaRow; conAcciones?: boolean }) {
    return (
      <div className="flex items-center justify-between rounded-capsule border border-border/70 bg-card px-5 py-4 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="w-36 shrink-0 text-sm font-semibold tabular-nums">
            {formatFecha(c.inicio)}
            <span className="block text-xs font-normal text-muted-foreground">
              {formatHoraRD(c.inicio)} – {formatHoraRD(c.fin)}
            </span>
          </div>
          <Link href={`/pacientes/${c.paciente_id}`} className="hover:underline">
            <p className="font-medium">{c.pacientes?.nombre_completo ?? "Paciente"}</p>
            {c.pacientes?.cedula && (
              <p className="text-xs text-muted-foreground">{c.pacientes.cedula}</p>
            )}
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${estadoClase[c.estado] ?? "bg-muted text-muted-foreground"}`}>
            {ESTADO_CITA_LABEL[c.estado] ?? c.estado}
          </span>
          {conAcciones && c.estado === "programada" && (
            <>
              <form action={cambiarEstadoCita.bind(null, c.id, "completada", fecha)}>
                <Button type="submit" size="sm" variant="outline">Completada</Button>
              </form>
              <form action={cambiarEstadoCita.bind(null, c.id, "no_asistio", fecha)}>
                <Button type="submit" size="sm" variant="outline">No asistió</Button>
              </form>
              <ConfirmDialog
                triggerLabel="Cancelar"
                triggerVariant="ghost"
                title="¿Cancelar cita?"
                description="La cita quedará cancelada y ese horario se liberará para otra cita."
                confirmLabel="Sí, cancelar"
                confirmVariant="destructive"
                action={cambiarEstadoCita.bind(null, c.id, "cancelada", fecha)}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="container py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Agenda</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Cámara única · su disponibilidad es esta agenda
            </p>
          </div>
          <Button asChild variant="vital">
            <Link href={`/agenda/nueva?fecha=${fecha}`}>
              <Plus className="h-4 w-4" /> Nueva cita
            </Link>
          </Button>
        </div>

        {(searchParams.creada === "1" || searchParams.actualizada === "1") && (
          <div className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ {searchParams.creada === "1" ? "Cita agendada" : "Cita actualizada"} correctamente.
          </div>
        )}
        {searchParams.error === "estado" && (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            No se pudo actualizar la cita. Inténtalo de nuevo.
          </div>
        )}

        {/* Pestañas de vista */}
        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button
              key={t.v}
              asChild
              size="sm"
              variant={!q && vista === t.v ? "default" : "outline"}
            >
              <Link href={qs({ vista: t.v, fecha })}>{t.label}</Link>
            </Button>
          ))}
        </div>

        {/* Búsqueda + filtro de estado */}
        <form method="get" className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input type="hidden" name="vista" value={vista} />
          <input type="hidden" name="fecha" value={fecha} />
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder="Buscar citas por paciente (nombre o cédula)…" className="pl-11" />
          </div>
          <Select name="estado" defaultValue={estado} className="sm:w-48">
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{ESTADO_CITA_LABEL[e]}</option>
            ))}
          </Select>
          <Button type="submit" variant="outline">Buscar</Button>
          {(q || estado) && (
            <Button asChild variant="ghost">
              <Link href={qs({ vista, fecha }).replace(/[?&]q=[^&]*/, "").replace(/[?&]estado=[^&]*/, "")}>
                Limpiar
              </Link>
            </Button>
          )}
        </form>

        {/* Navegación de fecha (no en búsqueda ni próximas) */}
        {!q && (vista === "dia" || vista === "semana" || vista === "mes") && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href={qs({ vista, fecha: shiftFecha(fecha, vista === "dia" ? -1 : vista === "semana" ? -7 : -28) })}>
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Link>
            </Button>
            <span className="text-sm font-medium">
              {vista === "dia" && `${DIAS_SEMANA[dowUTC(fecha)]} ${formatFecha(fecha)}`}
              {vista === "semana" && `Semana del ${formatFecha(lunesDe(fecha))}`}
              {vista === "mes" && formatFecha(`${fecha.slice(0, 7)}-01`).replace(/^\d+\//, "")}
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href={qs({ vista, fecha: shiftFecha(fecha, vista === "dia" ? 1 : vista === "semana" ? 7 : 28) })}>
                Siguiente <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        {/* ---- Contenido ---- */}
        <div className="mt-6">
          {q ? (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {citas.length} cita(s) encontradas para “{q}”.
              </p>
              <div className="space-y-3">
                {citas.length === 0 ? (
                  <div className="rounded-capsule border border-border/70 bg-card p-10 text-center text-muted-foreground shadow-soft">
                    No se encontraron citas.
                  </div>
                ) : (
                  citas.map((c) => <CitaLista key={c.id} c={c} />)
                )}
              </div>
            </>
          ) : vista === "dia" ? (
            <div className="space-y-3">
              {citas.length === 0 ? (
                <div className="rounded-capsule border border-border/70 bg-card p-10 text-center text-muted-foreground shadow-soft">
                  No hay citas para este día.
                </div>
              ) : (
                citas.map((c) => <CitaLista key={c.id} c={c} conAcciones />)
              )}
            </div>
          ) : vista === "proximas" ? (
            <div className="space-y-3">
              {citas.length === 0 ? (
                <div className="rounded-capsule border border-border/70 bg-card p-10 text-center text-muted-foreground shadow-soft">
                  No hay citas próximas.
                </div>
              ) : (
                citas.map((c) => <CitaLista key={c.id} c={c} />)
              )}
            </div>
          ) : vista === "semana" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
              {semana.map((d) => (
                <div key={d.fecha} className="rounded-capsule border border-border/70 bg-card p-3 shadow-soft">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {DIAS_CORTOS[dowUTC(d.fecha)]} {d.fecha.slice(8, 10)}
                    </p>
                    <Link href={qs({ vista: "dia", fecha: d.fecha })} className="text-xs text-primary hover:underline">
                      ver
                    </Link>
                  </div>
                  {!d.abierto ? (
                    <p className="text-xs text-muted-foreground">Cerrado</p>
                  ) : d.citas.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Libre</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {d.citas.map((c) => (
                        <li key={c.id} className="rounded-lg bg-secondary/50 px-2 py-1.5 text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${estadoPunto[c.estado] ?? "bg-muted-foreground"}`} />
                            <span className="font-medium tabular-nums">{formatHoraRD(c.inicio)}</span>
                          </span>
                          <Link href={`/pacientes/${c.paciente_id}`} className="block truncate hover:underline">
                            {c.pacientes?.nombre_completo ?? "Paciente"}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // mes
            <div className="overflow-hidden rounded-capsule border border-border/70 bg-card shadow-soft">
              <div className="grid grid-cols-7 border-b border-border/60 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                  <div key={d} className="py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {mesCeldas.map((cel) => (
                  <Link
                    key={cel.fecha}
                    href={qs({ vista: "dia", fecha: cel.fecha })}
                    className={`min-h-[72px] border-b border-r border-border/40 p-2 transition-colors hover:bg-accent/40 ${
                      cel.enMes ? "" : "bg-muted/30 text-muted-foreground"
                    } ${cel.fecha === hoyRD() ? "ring-1 ring-inset ring-primary" : ""}`}
                  >
                    <span className="text-xs font-medium tabular-nums">{cel.fecha.slice(8, 10)}</span>
                    {cel.n > 0 && (
                      <span className="mt-1 block w-fit rounded-pill bg-brand-cyan/15 px-1.5 text-[0.65rem] font-medium text-primary">
                        {cel.n} cita{cel.n > 1 ? "s" : ""}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
