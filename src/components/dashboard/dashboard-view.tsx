import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Clock,
  Gauge,
  Plus,
  Settings,
  Users,
  Wind,
} from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { ESTADO_CITA_LABEL } from "@/lib/constants/citas";
import { formatFecha, formatHoraRD } from "@/lib/format";

const estadoClase: Record<string, string> = {
  programada: "bg-brand-cyan/15 text-primary",
  completada: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelada: "bg-muted text-muted-foreground",
  no_asistio: "bg-destructive/15 text-destructive",
};

export type AgendaItem = {
  id: string;
  paciente_id: string;
  inicio: string;
  fin: string;
  estado: string;
  paciente: string;
};

export type TendenciaDia = { label: string; count: number };

export type DashboardData = {
  saludo: string; // "Buenos días"
  nombre: string; // "Dr. Ángel" o "Ángel"
  rol: "admin" | "enfermera" | "recepcion";
  citasHoy: number;
  proximaLabel: string | null; // "Próxima en 25 min" / "En curso ahora" / "a las 3:00 p. m."
  proximaPaciente: string | null;
  pacientesActivos: number;
  agenda: AgendaItem[];
  camaraEstado?: string | null;
  proximoMantenimiento?: string | null;
  // Solo clínico:
  sesionesSemana?: number;
  alertas?: number;
  tendencia?: TendenciaDia[];
};

const CAMARA_LABEL: Record<string, string> = {
  operativa: "Operativa",
  en_mantenimiento: "En mantenimiento",
  fuera_de_servicio: "Fuera de servicio",
};

function StatCard({
  icon: Icon,
  titulo,
  valor,
  pie,
  href,
  acento,
}: {
  icon: typeof Users;
  titulo: string;
  valor: string | number;
  pie?: string;
  href?: string;
  acento?: "alerta";
}) {
  const inner = (
    <Card
      className={`h-full p-6 transition-all duration-300 ease-breath ${
        href ? "hover:-translate-y-1 hover:shadow-lift" : ""
      } ${acento === "alerta" && Number(valor) > 0 ? "border-amber-500/50" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-pill ${
            acento === "alerta" && Number(valor) > 0
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              : "bg-accent text-primary"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        {href && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
        {valor}
      </p>
      {pie && <p className="mt-1 text-xs text-muted-foreground">{pie}</p>}
    </Card>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function DashboardView(props: DashboardData) {
  const {
    saludo,
    nombre,
    rol,
    citasHoy,
    proximaLabel,
    proximaPaciente,
    pacientesActivos,
    agenda,
    camaraEstado,
    proximoMantenimiento,
    sesionesSemana,
    alertas,
    tendencia,
  } = props;

  const esClinico = rol === "admin" || rol === "enfermera";
  const maxTendencia = Math.max(1, ...(tendencia ?? []).map((d) => d.count));

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      {/* Encabezado */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-pill bg-white p-1.5 shadow-soft">
              <Image
                src="/luxamed-logo.jpeg"
                alt="LUXAMED Hiperbárica"
                width={1172}
                height={798}
                className="h-7 w-auto"
                priority
              />
            </div>
            <Wordmark size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/agenda">Agenda</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/pacientes">Pacientes</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/camara">Cámara</Link>
              </Button>
            </nav>
            <Button asChild variant="ghost" size="icon" aria-label="Configuración">
              <Link href="/configuracion">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container py-10">
        {/* Saludo */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Panel
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {saludo}, <span className="text-primary">{nombre}</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/agenda/nueva">
                <CalendarDays className="h-4 w-4" />
                Nueva cita
              </Link>
            </Button>
            <Button asChild variant="vital">
              <Link href="/pacientes/nuevo">
                <Plus className="h-4 w-4" />
                Nuevo paciente
              </Link>
            </Button>
          </div>
        </div>

        {/* Tarjetas de resumen */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={CalendarDays}
            titulo="Citas de hoy"
            valor={citasHoy}
            pie={
              proximaLabel
                ? proximaPaciente
                  ? `${proximaLabel} · ${proximaPaciente}`
                  : proximaLabel
                : citasHoy === 0
                  ? "Sin citas hoy"
                  : "Todo el día atendido"
            }
            href="/agenda"
          />
          <StatCard
            icon={Users}
            titulo="Pacientes activos"
            valor={pacientesActivos}
            pie="En el sistema"
            href="/pacientes"
          />

          {camaraEstado && (
            <Link href="/camara" className="block h-full">
              <Card
                className={`h-full p-6 transition-all duration-300 ease-breath hover:-translate-y-1 hover:shadow-lift ${
                  camaraEstado !== "operativa" ? "border-amber-500/50" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-pill ${
                      camaraEstado !== "operativa"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-accent text-primary"
                    }`}
                  >
                    <Gauge className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                  Cámara
                </p>
                <p className="mt-1 text-xl font-semibold tracking-tight">
                  {CAMARA_LABEL[camaraEstado] ?? camaraEstado}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {proximoMantenimiento
                    ? `Próx. mantenimiento: ${formatFecha(proximoMantenimiento)}`
                    : "Sin mantenimiento programado"}
                </p>
              </Card>
            </Link>
          )}

          {esClinico ? (
            <>
              <StatCard
                icon={Wind}
                titulo="Sesiones esta semana"
                valor={sesionesSemana ?? 0}
                pie="Terapia hiperbárica"
              />
              <StatCard
                icon={AlertTriangle}
                titulo="Alertas clínicas"
                valor={alertas ?? 0}
                pie={
                  (alertas ?? 0) > 0
                    ? "Pacientes con contraindicación"
                    : "Sin contraindicaciones activas"
                }
                acento="alerta"
              />
            </>
          ) : null}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Agenda del día */}
          <section
            className={esClinico ? "lg:col-span-2" : "lg:col-span-3"}
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-4 w-4" />
                Agenda de hoy
              </h2>
              <Link
                href="/agenda"
                className="text-sm text-primary transition-colors hover:underline"
              >
                Ver agenda completa
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {agenda.length === 0 ? (
                <Card className="p-10 text-center text-muted-foreground">
                  No hay citas para hoy.
                </Card>
              ) : (
                agenda.map((c) => (
                  <Link
                    key={c.id}
                    href={`/pacientes/${c.paciente_id}`}
                    className="block"
                  >
                    <Card className="flex items-center justify-between p-4 transition-all duration-300 ease-breath hover:-translate-y-0.5 hover:shadow-lift">
                      <div className="flex items-center gap-4">
                        <div className="w-28 shrink-0 text-sm font-semibold tabular-nums">
                          {formatHoraRD(c.inicio)}
                          <span className="text-muted-foreground">
                            {" "}
                            – {formatHoraRD(c.fin)}
                          </span>
                        </div>
                        <p className="font-medium">{c.paciente}</p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${
                          estadoClase[c.estado] ??
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        {ESTADO_CITA_LABEL[c.estado] ?? c.estado}
                      </span>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Mini-tendencia (solo clínico) */}
          {esClinico && tendencia && (
            <section className="lg:col-span-1">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Wind className="h-4 w-4" />
                Sesiones por día
              </h2>
              <Card className="mt-4 p-6">
                <div className="flex h-40 items-end justify-between gap-2">
                  {tendencia.map((d) => (
                    <div
                      key={d.label}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">
                        {d.count > 0 ? d.count : ""}
                      </span>
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t-md bg-brand-cyan/70 transition-all"
                          style={{
                            height: `${Math.max(
                              d.count > 0 ? 8 : 2,
                              (d.count / maxTendencia) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] uppercase text-muted-foreground">
                        {d.label}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Esta semana · {sesionesSemana ?? 0} en total
                </p>
              </Card>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
