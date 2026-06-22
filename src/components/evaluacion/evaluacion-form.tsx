"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { ChevronDown, Loader2 } from "lucide-react";

import type { EvaluacionState } from "@/app/pacientes/[id]/evaluacion/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ANTECEDENTES,
  CONTRAINDICACIONES_RELATIVAS,
  INDICACIONES_HBO,
} from "@/lib/constants/evaluacion";

type Identidad = {
  nombre_completo: string;
  cedula: string | null;
  fecha_nacimiento: string | null;
  edad: string;
  sexo: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_telefono: string | null;
};

type Eval = Record<string, any> | null;

function Seccion({
  titulo,
  children,
  abierto = false,
}: {
  titulo: string;
  children: React.ReactNode;
  abierto?: boolean;
}) {
  return (
    <details
      open={abierto}
      className="group rounded-capsule border border-border/70 bg-card shadow-soft"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-6 py-4 font-semibold">
        {titulo}
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border/60 p-6">{children}</div>
    </details>
  );
}

function Campo({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`space-y-2 ${full ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

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

function Checks({
  prefijo,
  opciones,
  valores,
}: {
  prefijo: string;
  opciones: readonly { key: string; label: string }[];
  valores: Eval;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {opciones.map((o) => (
        <label key={o.key} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name={`${prefijo}${o.key}`}
            value="1"
            defaultChecked={Boolean(valores?.[o.key])}
            className="h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function GuardarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="vital" size="lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Guardando…
        </>
      ) : (
        "Guardar evaluación"
      )}
    </Button>
  );
}

export function EvaluacionForm({
  action,
  pacienteId,
  identidad,
  evaluacion,
  canEdit,
}: {
  action: (prev: EvaluacionState, fd: FormData) => Promise<EvaluacionState>;
  pacienteId: string;
  identidad: Identidad;
  evaluacion: Eval;
  canEdit: boolean;
}) {
  const [state, formAction] = useFormState<EvaluacionState, FormData>(action, {
    ok: false,
  });
  const e = evaluacion;

  // IMC autocalculado
  const [peso, setPeso] = React.useState<string>(e?.peso?.toString() ?? "");
  const [talla, setTalla] = React.useState<string>(e?.talla?.toString() ?? "");
  const imc = React.useMemo(() => {
    const p = parseFloat(peso);
    const t = parseFloat(talla);
    if (!p || !t) return "";
    return (p / (t * t)).toFixed(1);
  }, [peso, talla]);

  return (
    <form action={formAction} className="space-y-4">
      {!canEdit && (
        <div className="rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          Estás viendo la evaluación en modo lectura. Solo la doctora (admin)
          puede editarla.
        </div>
      )}
      {state.message && !state.ok && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.message}
        </div>
      )}

      {/* fieldset disabled = bloquea TODOS los campos para enfermera (solo lectura) */}
      <fieldset disabled={!canEdit} className="space-y-4">
        <Seccion titulo="1. Datos de identificación" abierto>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Dato label="Nombre" value={identidad.nombre_completo} />
            <Dato label="Cédula" value={identidad.cedula} />
            <Dato label="Fecha nac." value={identidad.fecha_nacimiento} />
            <Dato label="Edad" value={identidad.edad} />
            <Dato
              label="Sexo"
              value={
                identidad.sexo === "M"
                  ? "Masculino"
                  : identidad.sexo === "F"
                    ? "Femenino"
                    : identidad.sexo
              }
            />
            <Dato label="Teléfono" value={identidad.telefono} />
            <Dato label="Correo" value={identidad.email} />
            <Dato label="Dirección" value={identidad.direccion} />
            <Dato
              label="Contacto emergencia"
              value={
                [identidad.contacto_emergencia_nombre, identidad.contacto_emergencia_telefono]
                  .filter(Boolean)
                  .join(" · ") || "—"
              }
            />
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Autollenado desde el expediente del paciente.
          </p>
          <div className="mt-4">
            <Grid>
              <Campo label="Médico referente">
                <Input name="medico_referente" defaultValue={e?.medico_referente ?? ""} />
              </Campo>
              <Campo label="Especialidad">
                <Input
                  name="especialidad_referente"
                  defaultValue={e?.especialidad_referente ?? ""}
                />
              </Campo>
            </Grid>
          </div>
        </Seccion>

        <Seccion titulo="2. Motivo de consulta">
          <Textarea name="motivo_consulta" defaultValue={e?.motivo_consulta ?? ""} />
        </Seccion>

        <Seccion titulo="3. Diagnóstico">
          <Grid>
            <Campo label="Diagnóstico principal" full>
              <Input name="diagnostico_principal" defaultValue={e?.diagnostico_principal ?? ""} />
            </Campo>
            <Campo label="Diagnósticos asociados" full>
              <Input name="diagnosticos_asociados" defaultValue={e?.diagnosticos_asociados ?? ""} />
            </Campo>
            <Campo label="Tiempo de evolución">
              <Input name="tiempo_evolucion" defaultValue={e?.tiempo_evolucion ?? ""} />
            </Campo>
            <Campo label="Tratamientos previos">
              <Input name="tratamientos_previos" defaultValue={e?.tratamientos_previos ?? ""} />
            </Campo>
          </Grid>
        </Seccion>

        <Seccion titulo="4. Antecedentes patológicos">
          <Checks prefijo="ant_" opciones={ANTECEDENTES} valores={e?.antecedentes} />
          <div className="mt-4 space-y-4">
            <Campo label="Otros antecedentes" full>
              <Input name="ant_otros" defaultValue={e?.antecedentes?.otros ?? ""} />
            </Campo>
            <Campo label="Medicamentos actuales" full>
              <Textarea name="medicamentos_actuales" defaultValue={e?.medicamentos_actuales ?? ""} />
            </Campo>
            <Campo label="Alergias" full>
              <Input name="alergias" defaultValue={e?.alergias ?? ""} />
            </Campo>
          </div>
        </Seccion>

        <Seccion titulo="5. Evaluación HBO — indicación clínica">
          <Checks prefijo="ind_" opciones={INDICACIONES_HBO} valores={e?.indicacion_hbo} />
          <div className="mt-4 space-y-4">
            <Campo label="Otra indicación" full>
              <Input name="ind_otra" defaultValue={e?.indicacion_hbo?.otra ?? ""} />
            </Campo>
            <Campo label="Objetivo terapéutico" full>
              <Textarea name="objetivo_terapeutico" defaultValue={e?.objetivo_terapeutico ?? ""} />
            </Campo>
          </div>
        </Seccion>

        <Seccion titulo="6. Contraindicaciones">
          <label className="flex items-center gap-2 text-sm font-medium text-destructive">
            <input
              type="checkbox"
              name="ci_neumotorax_no_tratado"
              value="1"
              defaultChecked={Boolean(e?.contraindicaciones?.neumotorax_no_tratado)}
              className="h-4 w-4 rounded border-input"
            />
            Absoluta: Neumotórax no tratado
          </label>
          <p className="mb-2 mt-4 text-xs uppercase tracking-wide text-muted-foreground">
            Relativas
          </p>
          <Checks
            prefijo="ci_"
            opciones={CONTRAINDICACIONES_RELATIVAS}
            valores={e?.contraindicaciones}
          />
          <div className="mt-4">
            <Campo label="Otras contraindicaciones" full>
              <Input name="ci_otros" defaultValue={e?.contraindicaciones?.otros ?? ""} />
            </Campo>
          </div>
        </Seccion>

        <Seccion titulo="7. Evaluación otorrino">
          <Grid>
            <Campo label="Otoscopia derecha">
              <Select name="otoscopia_derecha" defaultValue={e?.otoscopia_derecha ?? ""}>
                <option value="">—</option>
                <option value="normal">Normal</option>
                <option value="alterada">Alterada</option>
              </Select>
            </Campo>
            <Campo label="Otoscopia izquierda">
              <Select name="otoscopia_izquierda" defaultValue={e?.otoscopia_izquierda ?? ""}>
                <option value="">—</option>
                <option value="normal">Normal</option>
                <option value="alterada">Alterada</option>
              </Select>
            </Campo>
            <Campo label="Capacidad de compensación">
              <Input name="capacidad_compensacion" defaultValue={e?.capacidad_compensacion ?? ""} />
            </Campo>
            <Campo label="Observaciones" full>
              <Textarea name="otorrino_observaciones" defaultValue={e?.otorrino_observaciones ?? ""} />
            </Campo>
          </Grid>
        </Seccion>

        <Seccion titulo="8. Examen físico">
          <Grid>
            <Campo label="TA (mmHg)">
              <Input name="ta" placeholder="120/80" defaultValue={e?.ta ?? ""} />
            </Campo>
            <Campo label="FC (lpm)">
              <Input name="fc" type="number" defaultValue={e?.fc ?? ""} />
            </Campo>
            <Campo label="FR (rpm)">
              <Input name="fr" type="number" defaultValue={e?.fr ?? ""} />
            </Campo>
            <Campo label="Temperatura (°C)">
              <Input name="temperatura" type="number" step="0.1" defaultValue={e?.temperatura ?? ""} />
            </Campo>
            <Campo label="SatO2 (%)">
              <Input name="sato2" type="number" min={0} max={100} defaultValue={e?.sato2 ?? ""} />
            </Campo>
            <Campo label="Peso (kg)">
              <Input
                name="peso"
                type="number"
                step="0.1"
                value={peso}
                onChange={(ev) => setPeso(ev.target.value)}
              />
            </Campo>
            <Campo label="Talla (m)">
              <Input
                name="talla"
                type="number"
                step="0.01"
                placeholder="1.70"
                value={talla}
                onChange={(ev) => setTalla(ev.target.value)}
              />
            </Campo>
            <Campo label="IMC (autocalculado)">
              <Input name="imc" value={imc} readOnly placeholder="—" />
            </Campo>
            <Campo label="Estado general" full>
              <Input name="estado_general" defaultValue={e?.estado_general ?? ""} />
            </Campo>
            <Campo label="Cardiovascular">
              <Input name="sistema_cardiovascular" defaultValue={e?.sistema_cardiovascular ?? ""} />
            </Campo>
            <Campo label="Respiratorio">
              <Input name="sistema_respiratorio" defaultValue={e?.sistema_respiratorio ?? ""} />
            </Campo>
            <Campo label="Neurológico">
              <Input name="sistema_neurologico" defaultValue={e?.sistema_neurologico ?? ""} />
            </Campo>
            <Campo label="Extremidades">
              <Input name="extremidades" defaultValue={e?.extremidades ?? ""} />
            </Campo>
          </Grid>
        </Seccion>

        <Seccion titulo="9. Evaluación médica">
          <Grid>
            <Campo label="¿Es candidato a HBO?">
              <Select
                name="es_candidato"
                defaultValue={
                  e?.es_candidato === true ? "si" : e?.es_candidato === false ? "no" : ""
                }
              >
                <option value="">—</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </Select>
            </Campo>
            <Campo label="N.º estimado de sesiones">
              <Input name="sesiones_estimadas" type="number" defaultValue={e?.sesiones_estimadas ?? ""} />
            </Campo>
            <Campo label="Presión sugerida (ATA)">
              <Input name="presion_ata" type="number" step="0.1" defaultValue={e?.presion_ata ?? ""} />
            </Campo>
            <Campo label="Duración por sesión (min)">
              <Input name="duracion_sesion_min" type="number" defaultValue={e?.duracion_sesion_min ?? ""} />
            </Campo>
            <Campo label="Justificación" full>
              <Textarea name="justificacion" defaultValue={e?.justificacion ?? ""} />
            </Campo>
          </Grid>
        </Seccion>

        <Seccion titulo="10. Plan de tratamiento">
          <Textarea name="plan_tratamiento" defaultValue={e?.plan_tratamiento ?? ""} />
        </Seccion>

        <Seccion titulo="11. Consentimiento informado">
          <p className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
            El paciente declara haber recibido información sobre el tratamiento de
            oxigenoterapia hiperbárica, sus beneficios, riesgos y alternativas, y
            autoriza su realización conforme a la Ley 172-13. (La firma se captura
            en la siguiente pieza.)
          </p>
          <div className="mt-4">
            <Campo label="Nombre de quien consiente" full>
              <Input name="consentimiento_nombre" defaultValue={e?.consentimiento_nombre ?? ""} />
            </Campo>
          </div>
        </Seccion>

        <Seccion titulo="12. Firma médica">
          <Grid>
            <Campo label="Dr./Dra.">
              <Input name="firma_medico" defaultValue={e?.firma_medico ?? ""} />
            </Campo>
            <Campo label="Fecha">
              <Input name="fecha_firma" type="date" defaultValue={e?.fecha_firma ?? ""} />
            </Campo>
          </Grid>
        </Seccion>
      </fieldset>

      {canEdit && (
        <div className="flex items-center gap-3 pt-2">
          <GuardarButton />
          <Button asChild variant="ghost">
            <Link href={`/pacientes/${pacienteId}`}>Volver a la ficha</Link>
          </Button>
        </div>
      )}
    </form>
  );
}
