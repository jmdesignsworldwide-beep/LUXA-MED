import Image from "next/image";
import {
  Activity,
  CalendarDays,
  Download,
  LogOut,
  Sparkles,
  User,
} from "lucide-react";

import { salirPortal } from "@/app/portal/[token]/verificar/actions";
import { Button } from "@/components/ui/button";
import { formatFecha, formatHoraRD } from "@/lib/format";
import type { PortalData } from "@/lib/portal-server";

function ProgresoRing({ hechas, total }: { hechas: number; total: number | null }) {
  const pct = total && total > 0 ? Math.min(100, Math.round((hechas / total) * 100)) : 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-secondary"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={total ? offset : c}
          className="text-brand-cyan transition-all"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-semibold tabular-nums">{hechas}</span>
        <span className="text-xs text-muted-foreground">
          {total ? `de ${total}` : "sesiones"}
        </span>
      </div>
    </div>
  );
}

export function PortalPanel({
  token,
  data,
}: {
  token: string;
  data: PortalData;
}) {
  const { paciente, citas, progreso, sesiones, tiene_documento } = data;
  const primerNombre = paciente.nombre.trim().split(/\s+/)[0];

  const conMejora = sesiones.filter(
    (s) => s.spo2_antes != null && s.spo2_despues != null,
  );
  const mejoraProm =
    conMejora.length > 0
      ? Math.round(
          conMejora.reduce(
            (acc, s) => acc + ((s.spo2_despues ?? 0) - (s.spo2_antes ?? 0)),
            0,
          ) / conMejora.length,
        )
      : null;

  const restantes =
    progreso.total != null ? Math.max(0, progreso.total - progreso.hechas) : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/50 via-background to-background">
      <div className="mx-auto max-w-md px-5 py-8">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-pill bg-white p-1.5 shadow-soft">
              <Image
                src="/luxamed-logo.jpeg"
                alt="LUXAMED Hiperbárica"
                width={1172}
                height={798}
                className="h-6 w-auto"
                priority
              />
            </div>
          </div>
          <form action={salirPortal.bind(null, token)}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </form>
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          Hola, <span className="text-primary">{primerNombre}</span> 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bienvenido a tu portal de seguimiento.
        </p>

        {/* Progreso */}
        <section className="mt-6 rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Tu progreso
          </h2>
          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
            <ProgresoRing hechas={progreso.hechas} total={progreso.total} />
            <div className="text-center sm:text-left">
              {progreso.total ? (
                restantes === 0 ? (
                  <p className="text-base font-medium text-emerald-600 dark:text-emerald-400">
                    ¡Completaste tu plan de {progreso.total} sesiones! 🎉
                  </p>
                ) : (
                  <p className="text-base">
                    Llevas{" "}
                    <span className="font-semibold text-primary">
                      {progreso.hechas}
                    </span>{" "}
                    sesiones. Te {restantes === 1 ? "queda" : "quedan"}{" "}
                    <span className="font-semibold">{restantes}</span> para
                    completar tu plan. ¡Vas muy bien! 💪
                  </p>
                )
              ) : (
                <p className="text-base">
                  Llevas{" "}
                  <span className="font-semibold text-primary">
                    {progreso.hechas}
                  </span>{" "}
                  {progreso.hechas === 1 ? "sesión" : "sesiones"} de terapia. ¡Sigue
                  así! 💪
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Oxigenación */}
        {conMejora.length > 0 && (
          <section className="mt-5 rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Activity className="h-4 w-4" />
              Tu oxigenación
            </h2>
            {mejoraProm != null && mejoraProm > 0 && (
              <p className="mt-3 text-sm">
                En promedio, tu oxigenación sube{" "}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  +{mejoraProm}%
                </span>{" "}
                en cada sesión. ¡Tu cuerpo está respondiendo! 🫧
              </p>
            )}
            <div className="mt-4 space-y-2">
              {conMejora.slice(0, 5).map((s, i) => {
                const delta = (s.spo2_despues ?? 0) - (s.spo2_antes ?? 0);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-2xl bg-secondary/50 px-4 py-2.5 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {s.numero ? `Sesión ${s.numero}` : formatFecha(s.fecha)}
                    </span>
                    <span className="flex items-center gap-2 tabular-nums">
                      <span className="text-muted-foreground">{s.spo2_antes}%</span>
                      <span aria-hidden>→</span>
                      <span className="font-semibold">{s.spo2_despues}%</span>
                      {delta > 0 && (
                        <span className="rounded-pill bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          +{delta}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Próximas citas */}
        <section className="mt-5 rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            Tus próximas citas
          </h2>
          {citas.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No tienes citas próximas agendadas. La clínica te avisará para tu
              siguiente sesión.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {citas.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-2xl bg-secondary/50 px-4 py-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-brand-cyan/15 text-primary">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {formatFecha(c.inicio)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatHoraRD(c.inicio)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Documento firmado */}
        {tiene_documento && (
          <section className="mt-5 rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Tus documentos
            </h2>
            <Button asChild variant="outline" className="mt-4 w-full">
              <a href={`/portal/${token}/consentimiento`} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
                Descargar consentimiento firmado
              </a>
            </Button>
          </section>
        )}

        {/* Datos personales */}
        <section className="mt-5 rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <User className="h-4 w-4" />
            Mis datos
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Dato label="Nombre" value={paciente.nombre} />
            <Dato label="Cédula" value={paciente.cedula} />
            <Dato label="Teléfono" value={paciente.telefono} />
            <Dato label="Correo" value={paciente.email} />
            <Dato label="Dirección" value={paciente.direccion} />
            <Dato
              label="Fecha de nacimiento"
              value={
                paciente.fecha_nacimiento
                  ? formatFecha(paciente.fecha_nacimiento)
                  : null
              }
            />
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            ¿Algún dato incorrecto? Avísanos en tu próxima visita y lo
            actualizamos.
          </p>
        </section>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          LUXAMED Hiperbárica · Tu información está protegida y es privada.
        </p>
      </div>
    </main>
  );
}

function Dato({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}
