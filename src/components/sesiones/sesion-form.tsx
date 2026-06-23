"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import {
  registrarSesion,
  type SesionState,
} from "@/app/pacientes/[id]/sesiones/nueva/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CitaOpt = { id: string; label: string };

function ErrorMsg({ id, errors }: { id: string; errors?: Record<string, string[]> }) {
  const m = errors?.[id]?.[0];
  return m ? <p className="text-sm text-destructive">{m}</p> : null;
}
function Campo({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-2 ${full ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}
function GuardarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="vital" size="lg" disabled={pending}>
      {pending ? (<><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</>) : "Registrar sesión"}
    </Button>
  );
}

export function SesionForm({
  pacienteId,
  citas,
  defaultCitaId,
  defaults,
}: {
  pacienteId: string;
  citas: CitaOpt[];
  defaultCitaId: string;
  defaults: { numero_sesion: number; total_sesiones: string; presion_ata: string };
}) {
  const [state, formAction] = useFormState<SesionState, FormData>(
    registrarSesion.bind(null, pacienteId),
    { ok: false },
  );
  const errors = state.errors;

  return (
    <form action={formAction} className="space-y-7">
      {state.message && !state.ok && (
        <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      <Bloque titulo="Vínculo y número de sesión">
        <Campo label="Cita del paciente">
          <Select name="cita_id" defaultValue={defaultCitaId}>
            {citas.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
            <option value="">Sin cita asociada (walk-in)</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            Al guardar, la cita programada queda marcada como completada.
          </p>
          <ErrorMsg id="cita_id" errors={errors} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="N.º de sesión">
            <Input name="numero_sesion" type="number" min={1} defaultValue={defaults.numero_sesion} />
          </Campo>
          <Campo label="Total (de la evaluación)">
            <Input name="total_sesiones" type="number" min={1} defaultValue={defaults.total_sesiones} />
          </Campo>
        </div>
      </Bloque>

      <Bloque titulo="Signos ANTES">
        <Campo label="SpO2 antes (%)">
          <Input name="spo2_antes" type="number" min={0} max={100} />
        </Campo>
        <Campo label="TA antes (mmHg)">
          <Input name="ta_antes" placeholder="120/80" />
        </Campo>
        <Campo label="FC antes (lpm)">
          <Input name="fc_antes" type="number" />
        </Campo>
      </Bloque>

      <Bloque titulo="Parámetros de cámara">
        <Campo label="Presión usada (ATA)">
          <Input name="presion_ata" type="number" step="0.1" defaultValue={defaults.presion_ata} />
        </Campo>
        <Campo label="Duración real (min)">
          <Input name="duracion_min" type="number" />
        </Campo>
      </Bloque>

      <Bloque titulo="Signos DESPUÉS">
        <Campo label="SpO2 después (%)">
          <Input name="spo2_despues" type="number" min={0} max={100} />
        </Campo>
      </Bloque>

      <Bloque titulo="Evolución / incidencias">
        <Campo label="Evolución y observaciones" full>
          <Textarea name="evolucion" placeholder="Cómo respondió el paciente…" />
        </Campo>
        <Campo label="Incidencias (si hubo algún problema)" full>
          <Textarea name="incidencias" placeholder="Sin incidencias / describir" />
        </Campo>
      </Bloque>

      <div className="flex items-center gap-3 pt-1">
        <GuardarButton />
        <Button asChild variant="ghost">
          <Link href={`/pacientes/${pacienteId}`}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
