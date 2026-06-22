"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { agendarCita, type CitaState } from "@/app/agenda/nueva/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DURACIONES_RAPIDAS } from "@/lib/constants/citas";

type PacienteOpt = { id: string; nombre_completo: string; cedula: string | null };

function ErrorMsg({ id, errors }: { id: string; errors?: Record<string, string[]> }) {
  const msg = errors?.[id]?.[0];
  return msg ? <p className="text-sm text-destructive">{msg}</p> : null;
}

function GuardarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="vital" size="lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Agendando…
        </>
      ) : (
        "Agendar cita"
      )}
    </Button>
  );
}

export function CitaForm({
  pacientes,
  defaultFecha,
}: {
  pacientes: PacienteOpt[];
  defaultFecha: string;
}) {
  const [state, formAction] = useFormState<CitaState, FormData>(agendarCita, {
    ok: false,
  });
  const [duracion, setDuracion] = React.useState(45);

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.ok && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="paciente_id">Paciente *</Label>
        <Select id="paciente_id" name="paciente_id" defaultValue="" required>
          <option value="" disabled>
            Selecciona un paciente…
          </option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre_completo}
              {p.cedula ? ` — ${p.cedula}` : ""}
            </option>
          ))}
        </Select>
        <ErrorMsg id="paciente_id" errors={state.errors} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fecha">Fecha *</Label>
          <Input
            id="fecha"
            name="fecha"
            type="date"
            defaultValue={defaultFecha}
            required
          />
          <ErrorMsg id="fecha" errors={state.errors} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hora">Hora de inicio *</Label>
          <Input id="hora" name="hora" type="time" step={300} required />
          <ErrorMsg id="hora" errors={state.errors} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Duración *</Label>
        <div className="flex flex-wrap items-center gap-3">
          {DURACIONES_RAPIDAS.map((d) => (
            <Button
              key={d.min}
              type="button"
              variant={duracion === d.min ? "default" : "outline"}
              onClick={() => setDuracion(d.min)}
            >
              {d.label}
            </Button>
          ))}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={15}
              max={480}
              step={5}
              value={duracion}
              onChange={(e) => setDuracion(Number(e.target.value) || 0)}
              className={cn("w-24")}
              aria-label="Duración personalizada en minutos"
            />
            <span className="text-sm text-muted-foreground">min</span>
          </div>
        </div>
        <input type="hidden" name="duracion_min" value={duracion} />
        <ErrorMsg id="duracion_min" errors={state.errors} />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <GuardarButton />
        <Button asChild variant="ghost">
          <Link href="/agenda">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
