"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  ChevronRight,
  Clock,
  Gauge,
  Plus,
  Users,
  Wind,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ESTADO_CITA_LABEL } from "@/lib/constants/citas";
import { formatFecha, formatHoraRD } from "@/lib/format";
import { cascadeContainer, riseIn } from "@/lib/motion";

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
  proximaLabel: string | null;
  proximaPaciente: string | null;
  pacientesActivos: number;
  agenda: AgendaItem[];
  camaraEstado?: string | null;
  proximoMantenimiento?: string | null;
  insumosBajoStock?: number;
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

/** Tarjeta de resumen (cada una es un ítem de la cascada). */
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
  const resalta = acento === "alerta" && Number(valor) > 0;
  const inner = (
    <Card className={`h-full p-6 ${resalta ? "border-amber-500/50" : ""}`}>
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-pill ${
            resalta
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

  return (
    <motion.div variants={riseIn} className="h-full">
      {href ? (
        <Link href={href} className="block h-full">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </motion.div>
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
    insumosBajoStock,
    sesionesSemana,
    alertas,
    tendencia,
  } = props;

  const esClinico = rol === "admin" || rol === "enfermera";
  const maxTendencia = Math.max(1, ...(tendencia ?? []).map((d) => d.count));

  return (
    <motion.main
      variants={cascadeContainer}
      initial="hidden"
      animate="show"
      className="min-h-screen"
    >
      <div className="container py-10">
        {/* Saludo */}
        <motion.div
          variants={riseIn}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
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
        </motion.div>

        {/* Tarjetas de resumen — TODAS entran con la misma cascada */}
        <motion.div
          variants={cascadeContainer}
          className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
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
            <motion.div variants={riseIn} className="h-full">
              <Link href="/camara" className="block h-full">
                <Card
                  className={`h-full p-6 ${
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
            </motion.div>
          )}

          {(insumosBajoStock ?? 0) > 0 && (
            <StatCard
              icon={Boxes}
              titulo="Insumos bajo stock"
              valor={insumosBajoStock ?? 0}
              pie="Requieren reposición"
              href="/inventario"
              acento="alerta"
            />
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
        </motion.div>

        {/* Agenda + tendencia */}
        <motion.div
          variants={riseIn}
          className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3"
        >
          {/* Agenda del día */}
          <section className={esClinico ? "lg:col-span-2" : "lg:col-span-3"}>
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
                    <Card className="flex items-center justify-between p-4">
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
        </motion.div>
      </div>
    </motion.main>
  );
}
